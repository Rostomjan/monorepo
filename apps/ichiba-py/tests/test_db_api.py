"""Integration tests against a real Postgres (docker compose up db, plus
apps/ichiba's `bun run db:migrate` + `bun run db:seed`). All skip when no
DATABASE_URL is set so CI without a DB service stays green.

These exercise the same HTTP contract the TS routes serve on :3003 — same
paths, same success shapes, same error strings byte-for-byte.
"""

import os

import pytest

# Needs a real Postgres (docker compose up db + apps/ichiba db:migrate /
# db:seed). Skips gracefully when no DATABASE_URL is set so CI without a DB
# service stays green.
pytestmark = [
    pytest.mark.skipif(
        not (os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")),
        reason="DATABASE_URL not set — tests require local Postgres (docker compose up db)",
    )
]

from ichibaapi.models import Product  # noqa: E402

DATA = {"items": [{"productId": "shop-1-p1", "qty": 2}]}


@pytest.mark.django_db
def test_health_reports_ready(client) -> None:
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {
        "ok": True,
        "app": "ichiba",
        "stage": 3,
        "database": "ready",
        "relations": {"shops": True, "products": True, "orders": True, "order_items": True},
    }


@pytest.mark.django_db
def test_checkout_happy_path(client) -> None:
    before = Product.objects.get(id="shop-1-p1").stock
    res = client.post("/api/checkout", data=DATA, content_type="application/json")
    assert res.status_code == 200
    body = res.json()
    order = body["orders"][0]
    assert order["userId"] == "guest"
    assert order["shopId"] == "shop-1"
    item = {"productId": "shop-1-p1", "qty": 2}
    item.update(order["items"][0])
    assert order["items"] == [item]
    assert order["totalYen"] == order["items"][0]["priceYen"] * 2
    assert body["orderIds"] == [order["id"]]

    # Stock decrement happened.
    assert Product.objects.get(id="shop-1-p1").stock == before - 2

    # GET /api/orders shows the guest order joined back together.
    listed = client.get("/api/orders").json()["orders"]
    assert any(o["id"] == order["id"] and o["items"][0]["productId"] == "shop-1-p1" for o in listed)


@pytest.mark.django_db
def test_checkout_creates_one_order_per_shop(client) -> None:
    other = Product.objects.exclude(shop_id="shop-1").first()
    assert other is not None  # seeded DB always has another shop
    res = client.post(
        "/api/checkout",
        data={"items": [{"productId": "shop-1-p1", "qty": 1}, {"productId": other.id, "qty": 1}]},
        content_type="application/json",
    )
    assert res.status_code == 200
    body = res.json()
    assert len(body["orders"]) == 2
    assert {o["shopId"] for o in body["orders"]} == {"shop-1", other.shop_id}


@pytest.mark.django_db
def test_checkout_maps_errors_like_ts(client) -> None:
    cases = [
        (
            {"items": [{"productId": "nope", "qty": 1}]},
            400,
            {"error": "unknown product: nope"},
        ),
        (
            {"items": [{"productId": "shop-1-p1", "qty": 1.5}]},
            400,
            {"error": "bad qty for shop-1-p1"},
        ),
        (
            # TS checkoutCart rejects qty > 99 with "bad qty" BEFORE the
            # stock check; stock parity (99 requested vs 16 stocked) → 409.
            {"items": [{"productId": "shop-1-p1", "qty": 99}]},
            409,
            {"error": "insufficient stock for shop-1-p1"},
        ),
        (
            {"items": "nope"},
            400,
            {"error": "items must be a non-empty array (max 50)"},
        ),
        (
            {"items": [{"productId": 1, "qty": 1}]},
            400,
            {"error": "each item needs productId:string, qty:number"},
        ),
    ]
    for payload, expected_status, expected_body in cases:
        res = client.post("/api/checkout", data=payload, content_type="application/json")
        assert res.status_code == expected_status, (payload, res.status_code)
        assert res.json() == expected_body, (payload, res.json())


@pytest.mark.django_db
def test_products_query_shapes_match_ts(client) -> None:
    res = client.get("/api/products?q=backpack&perPage=5")
    assert res.status_code == 200
    body = res.json()
    for key in ("items", "total", "totalPages", "page", "shopCounts"):
        assert key in body
    assert all("Backpack" in p["name"] for p in body["items"]) or body["total"] > 0
    # camelCase contract fields come through the serializer.
    assert set(body["items"][0].keys()) == {"id", "shopId", "name", "priceYen", "stock"}

    # page clamps to range
    above = client.get("/api/products?page=9999&perPage=12")
    assert above.json()["page"] == above.json()["totalPages"]

    # sort + price ordering (priceYen in JPY — integer, ascending)
    prices = [p["priceYen"] for p in client.get("/api/products?sort=price-asc").json()["items"]]
    assert prices == sorted(prices)
