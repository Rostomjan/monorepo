"""Live contract checker for the ichiba backend contract
(docs/BACKEND_TWINS.md). Run it against ANY implementation:

  python3 scripts/contract.py http://localhost:3022          # Go (apps/ichiba-go)
  uv run scripts/contract.py http://localhost:3021           # Django (apps/ichiba-py)
  uv run scripts/contract.py http://localhost:3003           # TS (apps/ichiba)

Pure stdlib — no venv, no dependencies, works from any checkout.

Read-only checks run always; POST /api/checkout is opt-in via --write
because it consumes real stock and writes orders to the shared Postgres.
Backends that implement the read contract only (phase 1 — apps/ichiba-go
today) use --reads-only, which skips the write-path checks entirely:
orders + checkout are expected to 404 there until they are ported as a
new contract change.
"""

import argparse
import json as jsonlib
import sys
import urllib.error
import urllib.request

FAILS: list[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    print(f"{'ok ' if ok else 'FAIL'}  {name}" + (f" — {detail}" if detail and not ok else ""))  # noqa: T201
    if not ok:
        FAILS.append(name)


def get(base: str, path: str) -> tuple[int, object]:
    req = urllib.request.Request(f"{base}{path}")
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            return res.status, jsonlib.load(res)
    except urllib.error.HTTPError as exc:
        body = exc.read()
        try:
            return exc.code, jsonlib.loads(body)
        except ValueError:
            return exc.code, body.decode(errors="replace")


def post(base: str, path: str, payload: bytes) -> tuple[int, object]:
    req = urllib.request.Request(
        f"{base}{path}",
        data=payload,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            return res.status, jsonlib.load(res)
    except urllib.error.HTTPError as exc:
        body = exc.read()
        try:
            return exc.code, jsonlib.loads(body)
        except ValueError:
            return exc.code, body.decode(errors="replace")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base_url", help="e.g. http://localhost:3003 or http://localhost:3021")
    parser.add_argument("--write", action="store_true", help="also exercise POST /api/checkout")
    parser.add_argument(
        "--reads-only",
        action="store_true",
        help="phase-1 backends: check the read contract only (no /api/checkout, no /api/orders)",
    )
    args = parser.parse_args()
    base = args.base_url.rstrip("/")

    status, health = get(base, "/api/health")
    health_ok = (
        status == 200
        and isinstance(health, dict)
        and health.get("ok") is True
        and set(health.get("relations", {})) >= {"shops", "products", "orders", "order_items"}
    )
    check(
        "GET /api/health → 200 with ok:true + relations",
        health_ok,
        f"status={status} body={health!r}",
    )

    status, products = get(base, "/api/products?perPage=2")
    ts_catalog_endpoint = status != 404
    if ts_catalog_endpoint:
        first = products.get("items", [{}])[0] if isinstance(products, dict) else {}
        shape_ok = (
            status == 200
            and isinstance(products, dict)
            and set(first.keys()) >= {"id", "shopId", "name", "priceYen", "stock"}
        )
        check("GET /api/products → 200 camelCase items + paging", shape_ok, f"status={status}")

    status, shops = get(base, "/api/shops")
    check("GET /api/shops → 200 (or absent on TS)", status in (200, 404), f"status={status}")

    if not args.reads_only:
        status, orders = get(base, "/api/orders")
        orders_ok = (
            status == 200 and isinstance(orders, dict) and isinstance(orders.get("orders"), list)
        )
        check(
            "GET /api/orders → 200 {orders: [...]}",
            orders_ok,
            f"status={status} body={orders!r}",
        )

        # Error contract — must be identical strings on both backends.
        status, body = post(base, "/api/checkout", b"not json")
        check(
            "POST /api/checkout bad json → 400 invalid json",
            status == 400 and body == {"error": "invalid json"},
            f"status={status} body={body!r}",
        )

        status, body = post(base, "/api/checkout", jsonlib.dumps({"items": []}).encode())
        check(
            "POST /api/checkout empty items → 400",
            status == 400 and body == {"error": "items must be a non-empty array (max 50)"},
            f"status={status} body={body!r}",
        )

        status, body = post(
            base,
            "/api/checkout",
            jsonlib.dumps({"items": [{"productId": "nope", "qty": 1}]}).encode(),
        )
        check(
            "POST /api/checkout unknown product → 400",
            status == 400 and body == {"error": "unknown product: nope"},
            f"status={status} body={body!r}",
        )

        if args.write:
            product_ids: list[str] = []
            if ts_catalog_endpoint and isinstance(products, dict) and products.get("items"):
                product_ids = [item["id"] for item in products["items"][:1]]
            if product_ids:
                status, body = post(
                    base,
                    "/api/checkout",
                    jsonlib.dumps({"items": [{"productId": product_ids[0], "qty": 1}]}).encode(),
                )
                order_ok = (
                    status == 200
                    and isinstance(body, dict)
                    and len(body.get("orders", [])) == 1
                    and body.get("orderIds") == [body["orders"][0]["id"]]
                )
                check(
                    "POST /api/checkout happy path → 200 orders[] cited",
                    order_ok,
                    f"status={status} body={body!r}",
                )
            else:
                print("WARN  no products to write-check against")  # noqa: T201

    print()  # noqa: T201
    if FAILS:
        print(f"{len(FAILS)} contract check(s) failed: {', '.join(FAILS)}")  # noqa: T201
        return 1
    print("All contract checks passed.")  # noqa: T201
    return 0


if __name__ == "__main__":
    sys.exit(main())
