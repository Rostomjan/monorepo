"""Parity port of apps/ichiba/src/lib/orders.test.ts — same three
scenarios, fixture-backed lookup (no database).
"""

import pytest

from ichibaapi.catalog import Product, generate_catalog
from ichibaapi.orders import OrderError, split_cart_to_orders

# Fixture-backed lookup — same seam as the TS CatalogLookup interface.
shops, products = generate_catalog()
product_by_id: dict[str, Product] = {p["id"]: p for p in products}


class FixtureLookup:
    @staticmethod
    def product(product_id: str) -> Product | None:
        product = product_by_id.get(product_id)
        if not product:
            return None
        return product

    @staticmethod
    def shop_name(shop_id: str) -> str | None:
        for shop in shops:
            if shop["id"] == shop_id:
                return shop["name"]
        return None


def test_splits_a_mixed_shop_cart_into_one_order_per_shop() -> None:
    a, b = products[0], next(p for p in products if p["shopId"] != products[0]["shopId"])
    orders = split_cart_to_orders(
        [{"productId": a["id"], "qty": 2}, {"productId": b["id"], "qty": 1}],
        "guest",
        FixtureLookup()
    )
    assert len(orders) == 2
    assert orders[0]["totalYen"] > 0
    assert orders[0]["items"][0]["name"] == a["name"]


def test_rejects_unknown_products() -> None:
    with pytest.raises(OrderError, match=r"unknown product: nope"):
        split_cart_to_orders([{"productId": "nope", "qty": 1}], "guest", FixtureLookup())


def test_attributes_orders_to_users() -> None:
    [mine] = split_cart_to_orders(
        [{"productId": products[0]["id"], "qty": 1}],
        "user_123",
        FixtureLookup()
    )
    assert mine["userId"] == "user_123"


def test_rejects_bad_qty() -> None:
    with pytest.raises(OrderError, match=r"bad qty for"):
        split_cart_to_orders(
            [{"productId": products[0]["id"], "qty": 0}],
            "guest",
            FixtureLookup()
        )


def test_order_id_and_timestamp_shapes_match_ts() -> None:
    import re

    [order] = split_cart_to_orders(
        [{"productId": products[0]["id"], "qty": 1}],
        "guest",
        FixtureLookup()
    )
    assert re.fullmatch(r"order-\d+-\d+-\d+", order["id"])
    assert re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z", order["createdAt"])
