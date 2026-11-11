"""HTTP views — Python counterpart of apps/ichiba/src/app/api/*/route.ts.

The TS routes are Next.js route handlers; here they are DRF APIViews.
Body validation is deliberately hand-rolled (not DRF serializers) to keep
the error strings byte-identical with the TS handlers — the live contract
tests assert them verbatim. Output shaping uses serializers.
"""

import json

from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from ichibaapi import catalog, orders, rate_limit
from ichibaapi import serializers as s

# Clerk identity: the TS routes call `auth()` and fall back to "guest".
# An equivalent Clerk integration isn't wired here yet (see BACKEND_TWINS.md
# divergences) — until it is, every request is the Stage-1 guest.
GUEST = "guest"


def error(message: str, status: int) -> Response:
    """TS `Response.json({ error: message }, { status })` mirror."""
    return Response({"error": message}, status=status)


def db_guard() -> Response | None:
    """No DATABASE_URL configured: refuse JSON-ly (503) instead of a raw
    500. Mirrors the TS client's lazy-connect error, minus the throw."""
    from django.conf import settings

    if not settings.DATABASES:
        return error(
            "DATABASE_URL (or POSTGRES_URL) is not set — ichiba-py has no Postgres to talk to",
            503,
        )
    return None


class HealthView(APIView):
    """GET /api/health — liveness + catalog readiness. Reports which
    relations exist so a missing migration is a 10-second diagnosis instead
    of a 500 mystery on `/`. Same JSON shape as the TS route."""

    permission_classes = [AllowAny]

    def get(self, _request: Request) -> Response:
        status: dict[str, object] = {
            "ok": True,
            "app": "ichiba",
            "stage": 3,
            "database": "unknown",
            "relations": {},
        }
        relation_checks = {
            "shops": False,
            "products": False,
            "orders": False,
            "order_items": False,
        }
        try:
            from django.db import connection

            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT tablename FROM pg_tables "
                    "WHERE schemaname = 'public' "
                    "AND tablename IN ('shops', 'products', 'orders', 'order_items')"
                )
                found = {row[0] for row in cursor.fetchall()}
            for name in relation_checks:
                relation_checks[name] = name in found

            status["relations"] = relation_checks
            ready = all(relation_checks.values())
            status["database"] = "ready" if ready else "missing-migrations"
            if not ready:
                status["ok"] = False
        except Exception as exc:  # noqa: BLE001 — mirrors the TS catch-all
            status["ok"] = False
            status["database"] = str(exc)[:160]
        # Never cache health: it drives LB failover decisions.
        code = 200 if status["ok"] else 503
        return Response(status, status=code, headers={"Cache-Control": "no-store"})


class ProductsView(APIView):
    """GET /api/products — TS runs this through RSC + unstable_cache (never
    over HTTP); exposing it as an HTTP endpoint is what makes the Python
    backend a *service* the ichiba frontend could be pointed at."""

    def get(self, request: Request) -> Response:
        if unconfigured := db_guard():
            return unconfigured
        params = request.query_params
        sort = params.get("sort") or None
        try:
            page = int(params["page"]) if params.get("page") else None
            per_page = int(params["perPage"]) if params.get("perPage") else None
        except ValueError:
            return error("page and perPage must be integers", 400)
        if sort is not None and sort not in ("featured", "price-asc", "price-desc"):
            return error("sort must be one of: featured, price-asc, price-desc", 400)
        result = catalog.query_products(
            q=params.get("q"),
            shop_id=params.get("shopId") or None,
            sort=sort,
            page=page,
            per_page=per_page,
        )
        return Response(
            {
                "items": s.ProductSerializer(result["items"], many=True).data,
                "total": result["total"],
                "totalPages": result["totalPages"],
                "page": result["page"],
                "shopCounts": result["shopCounts"],
            }
        )


class ShopsView(APIView):
    """GET /api/shops."""

    def get(self, _request: Request) -> Response:
        if unconfigured := db_guard():
            return unconfigured
        return Response({"shops": s.ShopSerializer(catalog.list_shops(), many=True).data})


class CheckoutView(APIView):
    """POST /api/checkout — mock payment that always succeeds. Validates
    stock, creates per-shop Orders in one atomic transaction."""

    def post(self, request: Request) -> Response:
        if unconfigured := db_guard():
            return unconfigured

        # Cloud replacement for nginx `limit_req zone=write_zone`: 429 when
        # over budget. No-op locally (no Upstash env) so dev/CI stay green.
        if not rate_limit.check_write_rate_limit(rate_limit.client_ip(dict(request.headers))):
            return error("too many requests", 429)

        try:
            body = json.loads(request.body or b"")
        except (ValueError, UnicodeDecodeError):
            return error("invalid json", 400)

        lines = body.get("items") if isinstance(body, dict) else None
        if not isinstance(lines, list) or len(lines) == 0 or len(lines) > 50:
            return error("items must be a non-empty array (max 50)", 400)

        cleaned: list[orders.CheckoutLine] = []
        for item in lines:
            # `typeof productId !== "string" || typeof qty !== "number"`:
            # note JSON booleans are ints in Python — reject them explicitly.
            product_id = item.get("productId") if isinstance(item, dict) else None
            qty = item.get("qty") if isinstance(item, dict) else None
            if (
                not isinstance(product_id, str)
                or isinstance(qty, bool)
                or not isinstance(qty, (int, float))
            ):
                return error("each item needs productId:string, qty:number", 400)
            # Contract parity quirk: the TS route accepts any JSON number
            # here and lets checkoutCart reject non-integers (1.5 → "bad
            # qty"). TypedDict wants int; the runtime error path is the
            # authority, so ignore refines to float-then-400.
            cleaned.append({"productId": product_id, "qty": qty})  # type: ignore[typeddict-item]

        try:
            # Mock payment: always succeeds. Stock decrement is atomic
            # (single transaction). Orders are attributed to the signed-in
            # user, or "guest".
            split = orders.checkout_cart(cleaned, GUEST)
        except orders.OrderError as exc:
            return error(str(exc), exc.status)
        return Response(
            {
                "orderIds": [o["id"] for o in split],
                "orders": s.OrderSerializer(split, many=True).data,
            }
        )


class OrdersView(APIView):
    """GET /api/orders — the caller's orders (guest until Clerk lands here)."""

    def get(self, _request: Request) -> Response:
        if unconfigured := db_guard():
            return unconfigured
        return Response({"orders": s.OrderSerializer(orders.list_orders(GUEST), many=True).data})
