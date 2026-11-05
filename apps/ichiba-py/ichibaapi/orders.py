"""Orders/checkout — Python port of apps/ichiba/src/lib/orders.ts.

Contract rules mirrored exactly:
- a mixed-shop cart splits into one Order per Shop;
- OrderItems snapshot name+price at purchase time;
- checkout validates, locks rows (SELECT … FOR UPDATE), decrements stock,
  and persists — all inside ONE transaction, so concurrent checkouts for
  the same product serialize on the row lock instead of overselling;
- error strings are identical to the TS ones because HTTP contract tests
  assert them verbatim.
"""

import random
import time
import typing
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Literal, TypedDict

from django.db import transaction

from ichibaapi import catalog, models


class CheckoutLine(TypedDict):
    productId: str
    qty: int


class OrderItemPayload(TypedDict):
    productId: str
    name: str
    priceYen: int
    qty: int


class OrderPayload(TypedDict):
    id: str
    # Clerk user id in TS, or "guest" for signed-out checkout (see docs
    # divergence note: python backend always sees "guest" for now).
    userId: str
    shopId: str
    shopName: str
    items: list[OrderItemPayload]
    totalYen: int
    createdAt: str


class CatalogProduct(TypedDict):
    """The lookup seam's product snapshot — exactly the TS `CatalogLookup`
    product shape ({id, shopId, name, priceYen}) for runtime parity."""

    id: str
    shopId: str
    name: str
    priceYen: int


@dataclass
class OrderError(Exception):
    """Carries the contract's error string + expected HTTP status."""

    message: str
    status: Literal[400, 409] = 400

    def __str__(self) -> str:
        return self.message


class CatalogLookup(typing.Protocol):
    """Injected so unit tests run on fixtures without a database — same
    seam as the TS `CatalogLookup` interface."""

    def product(self, product_id: str) -> CatalogProduct | None: ...

    def shop_name(self, shop_id: str) -> str | None: ...


class DbLookup:
    @staticmethod
    def product(product_id: str) -> CatalogProduct | None:
        found = catalog.get_product(product_id)
        if not found:
            return None
        return {
            "id": found["id"],
            "shopId": found["shopId"],
            "name": found["name"],
            "priceYen": found["priceYen"],
        }

    @staticmethod
    def shop_name(shop_id: str) -> str | None:
        shop = catalog.get_shop(shop_id)
        return shop["name"] if shop else None


db_lookup = DbLookup()


def iso_now() -> str:
    """TS `new Date().toISOString()`: millisecond precision, trailing Z."""
    now = datetime.now(UTC)
    return f"{now:%Y-%m-%dT%H:%M:%S}.{now.microsecond // 1000:03d}Z"


def new_order_id(i: int, rng: random.Random | None = None) -> str:
    """Same shape as TS: `order-{epochMs}-{i}-{floor(random()*1e6)}`."""
    r = rng or random
    return f"order-{int(time.time() * 1000)}-{i}-{r.randrange(10**6)}"


def split_cart_to_orders(
    lines: list[CheckoutLine],
    user_id: str = "guest",
    lookup: CatalogLookup = db_lookup,
) -> list[OrderPayload]:
    """Pure apart from the injected lookup: split a mixed-shop cart into one
    Order per Shop (Ichiba rule)."""
    by_shop: dict[str, list[OrderItemPayload]] = {}
    for line in lines:
        product = lookup.product(line["productId"])
        if not product:
            raise OrderError(f"unknown product: {line['productId']}")
        qty = line["qty"]
        if qty <= 0 or qty > 99:
            raise OrderError(f"bad qty for {line['productId']}")
        by_shop.setdefault(product["shopId"], []).append(
            {
                "productId": product["id"],
                "name": product["name"],
                "priceYen": product["priceYen"],
                "qty": qty,
            }
        )
    now = iso_now()
    orders: list[OrderPayload] = []
    for i, (shop_id, items) in enumerate(by_shop.items()):
        orders.append(
            {
                "id": new_order_id(i),
                "userId": user_id,
                "shopId": shop_id,
                "shopName": lookup.shop_name(shop_id) or shop_id,
                "items": items,
                "totalYen": sum(it["priceYen"] * it["qty"] for it in items),
                "createdAt": now,
            }
        )
    return orders


def _assemble(heads: list[models.Order]) -> list[OrderPayload]:
    """Reads reassemble orders + items; writes go through checkout_cart."""
    if not heads:
        return []
    head_ids = [h.id for h in heads]
    lines = models.OrderItem.objects.filter(order_id__in=head_ids).order_by("product_id")
    by_order: dict[str, list[OrderItemPayload]] = {}
    for line in lines:
        by_order.setdefault(line.order_id, []).append(
            {
                "productId": line.product_id,
                "name": line.name,
                "priceYen": line.price_yen,
                "qty": line.qty,
            }
        )
    return [
        {
            "id": h.id,
            "userId": h.user_id,
            "shopId": h.shop_id,
            "shopName": h.shop_name,
            "items": by_order.get(h.id, []),
            "totalYen": h.total_yen,
            "createdAt": h.created_at,
        }
        for h in heads
    ]


def list_orders(user_id: str | None = None) -> list[OrderPayload]:
    heads = models.Order.objects.all().order_by("-created_at")
    if user_id is not None:
        heads = heads.filter(user_id=user_id)
    return _assemble(list(heads))


def get_order(order_id: str, user_id: str | None = None) -> OrderPayload | None:
    order = _assemble(list(models.Order.objects.filter(id=order_id)[:1]))
    if not order:
        return None
    if user_id is not None and order[0]["userId"] != user_id:
        return None
    return order[0]


def checkout_cart(lines: list[CheckoutLine], user_id: str = "guest") -> list[OrderPayload]:
    """Atomic checkout — validate + lock rows + decrement stock + split into
    per-shop orders + persist, in one transaction."""
    if len(lines) == 0 or len(lines) > 50:
        raise OrderError("items must be a non-empty array (max 50)")

    with transaction.atomic():
        seen: dict[str, CatalogProduct] = {}
        for line in lines:
            product_id = line["productId"]
            qty = line["qty"]
            if not isinstance(qty, int) or isinstance(qty, bool) or qty < 1 or qty > 99:
                raise OrderError(f"bad qty for {product_id}", 400)
            # Row lock: concurrent checkouts for the same product serialize
            # here (drizzle equivalent: `.for("update")`).
            try:
                product = models.Product.objects.select_for_update().get(id=product_id)
            except models.Product.DoesNotExist:
                raise OrderError(f"unknown product: {product_id}") from None
            if qty > product.stock:
                raise OrderError(f"insufficient stock for {product_id}", 409)
            product.stock -= qty
            product.save(update_fields=["stock"])
            # Snapshot price/name from the locked pre-decrement row (TS does
            # the same: items store the row's price, not post-write data).
            seen[product.id] = {
                "id": product.id,
                "shopId": product.shop_id,
                "name": product.name,
                "priceYen": product.price_yen,
            }

        class TxLookup:
            @staticmethod
            def product(p_id: str) -> CatalogProduct | None:
                return seen.get(p_id)

            @staticmethod
            def shop_name(s_id: str) -> str | None:
                return models.Shop.objects.filter(id=s_id).values_list("name", flat=True).first()

        split = split_cart_to_orders(lines, user_id, TxLookup())
        for order in split:
            models.Order.objects.create(
                id=order["id"],
                user_id=order["userId"],
                shop_id=order["shopId"],
                shop_name=order["shopName"],
                total_yen=order["totalYen"],
                created_at=order["createdAt"],
            )
            models.OrderItem.objects.bulk_create(
                [
                    models.OrderItem(
                        order_id=order["id"],
                        product_id=it["productId"],
                        name=it["name"],
                        price_yen=it["priceYen"],
                        qty=it["qty"],
                    )
                    for it in order["items"]
                ]
            )
        return split
