"""Catalog — Python port of apps/ichiba/src/lib/catalog.ts, function for
function. Listing/paging/search semantics must match the TS version
exactly; that is the parity contract (docs/BACKEND_TWINS.md).
"""

import functools
import time
from collections.abc import Callable
from typing import TypedDict, TypeVar

from django.contrib.postgres.search import TrigramSimilarity
from django.db.models import Count, Q, QuerySet

from ichibaapi import models

# Nouns/adjectives MUST stay in lockstep with the TS arrays: generate_catalog
# doubles as a test/contract fixture factory, and the same seed must produce
# the same catalog in both languages.
ADJECTIVES = ["Classic", "Premium", "Eco", "Compact", "Deluxe", "Smart", "Handmade", "Limited"]
NOUNS = [
    "Matcha Set",
    "Rice Cooker",
    "Backpack",
    "Sneakers",
    "Tea Pot",
    "Headphones",
    "Kimono",
    "Knife Set",
    "Lantern",
    "Plush Toy",
]


class Shop(TypedDict):
    id: str
    name: str


class Product(TypedDict):
    id: str
    shopId: str
    name: str
    priceYen: int
    stock: int


class ProductQueryResult(TypedDict):
    items: list[Product]
    total: int
    totalPages: int
    page: int
    shopCounts: dict[str, int]


# TS leans on Next's unstable_cache (TTL + dedupe). Outside a framework,
# the same staleness contract is ~15 lines.
_T = TypeVar("_T")


def ttl_cache(seconds: int) -> Callable[[Callable[..., _T]], Callable[..., _T]]:
    def decorator(fn: Callable[..., _T]) -> Callable[..., _T]:
        results: dict[tuple, tuple[float, _T]] = {}

        @functools.wraps(fn)
        def wrapper(*args: object) -> _T:
            now = time.monotonic()
            cached = results.get(args)
            if cached and now - cached[0] < seconds:
                return cached[1]
            fresh = fn(*args)
            results[args] = (now, fresh)
            return fresh

        return wrapper

    return decorator


# --- deterministic PRNG (mulberry32 port of the exact TS variant in
# catalog.ts — note its second line is `(t + Math.imul(t ^ t>>>7, 61|t)) ^ t`,
# not the textbook `t ^= t + …`). 32-bit wrapping is explicit because Python
# ints don't wrap.
def mulberry32(seed: int) -> Callable[[], float]:
    def rand() -> float:
        nonlocal seed
        seed = (seed + 0x6D2B79F5) & 0xFFFFFFFF
        t = seed
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t = ((t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) ^ t) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

    return rand


def generate_catalog(
    shop_count: int = 40, products_per_shop: int = 30, seed: int = 42
) -> tuple[list[Shop], list[Product]]:
    """Same fixtures as TS `generateCatalog` for identical seeds."""
    rand = mulberry32(seed)
    shops: list[Shop] = [
        {"id": f"shop-{i + 1}", "name": f"Shop {i + 1} {ADJECTIVES[int(rand() * len(ADJECTIVES))]}"}
        for i in range(shop_count)
    ]
    products: list[Product] = []
    for shop in shops:
        for j in range(products_per_shop):
            noun = NOUNS[int(rand() * len(NOUNS))]
            adjective = ADJECTIVES[int(rand() * len(ADJECTIVES))]
            products.append(
                {
                    "id": f"{shop['id']}-p{j + 1}",
                    "shopId": shop["id"],
                    "name": f"{adjective} {noun} {j + 1}",
                    "priceYen": 500 + int(rand() * 20000),
                    "stock": 1 + int(rand() * 50),
                }
            )
    return shops, products


# --- entity lookups: 5 min TTL, same staleness contract as TS. A stale read
# can only surface a friendly 409 — checkout re-checks stock atomically.
@ttl_cache(300)
def get_shop(shop_id: str) -> Shop | None:
    shop = models.Shop.objects.filter(id=shop_id).first()
    return {"id": shop.id, "name": shop.name} if shop else None


def row_to_product(p: models.Product) -> Product:
    return {
        "id": p.id,
        "shopId": p.shop_id,
        "name": p.name,
        "priceYen": p.price_yen,
        "stock": p.stock,
    }


@ttl_cache(300)
def get_product(product_id: str) -> Product | None:
    product = models.Product.objects.filter(id=product_id).first()
    return row_to_product(product) if product else None


def list_shops() -> list[Shop]:
    rows = models.Shop.objects.order_by("id").values("id", "name")
    return [Shop(id=row["id"], name=row["name"]) for row in rows]


def get_products(ids: list[str]) -> dict[str, Product]:
    if not ids:
        return {}
    return {p.id: row_to_product(p) for p in models.Product.objects.filter(id__in=ids)}


# LIKE metacharacters in user input must not become wildcards. TS keeps this
# helper because drizzle does no escaping; Django's icontains family escapes
# %, _ and \\ automatically — the helper stays for the trigram branch (which
# needs no escaping either) and for parity tests.
def like_pattern(q: str) -> str:
    escaped = "".join(f"\\{c}" if c in "%_\\" else c for c in q)
    return f"%{escaped}%"


def _match(q: str) -> Q | None:
    t = q.strip()
    if not t:
        return None
    # Two bitmap-capable branches OR'ed (BitmapOr at scale), same rationale
    # as TS: ILIKE for guaranteed recall, trigram `%` operator for moderate
    # typos at its default 0.3 threshold. `similarity() > const` as a WHERE
    # function would poison the whole OR into a seqscan.
    return Q(name__icontains=t) | Q(name__trigram_similar=t)


def query_products(
    q: str | None = None,
    shop_id: str | None = None,
    sort: str | None = None,
    page: int | None = None,
    per_page: int | None = None,
) -> ProductQueryResult:
    """Single source for listing semantics: filter + sort + paginate + per-shop counts."""
    query = (q or "").strip()
    # `x if x is not None else default`, NOT `x or default`: TS's clamps are
    # `opts.perPage ?? 12` / `Math.max(opts.page ?? 1, 1)` — a present 0
    # clamps to 1, it does NOT fold into the default. (`or` hid that for
    # per_page=0 until the Go twin's clampDefaults comment flushed it out.)
    per = min(max(per_page if per_page is not None else 12, 1), 60)
    match = _match(query)

    qs: QuerySet[models.Product] = models.Product.objects.all()
    if match is not None:
        qs = qs.filter(match)
    if shop_id:
        qs = qs.filter(shop_id=shop_id)

    # Count first so the page clamps to range (same contract as TS).
    total = qs.count()
    total_pages = max(1, -(-total // per))
    safe_page = min(max(page if page is not None else 1, 1), total_pages)

    if query:
        qs = qs.annotate(similarity=TrigramSimilarity("name", query))
    if sort == "price-asc":
        qs = qs.order_by("price_yen", "id")
    elif sort == "price-desc":
        qs = qs.order_by("-price_yen", "id")
    elif query:
        # similarity() DESC ordering rides the trigram index — identical
        # clause to TS's `ORDER BY similarity(name, q) DESC`. mypy can't see
        # the annotated column name; django resolves it at runtime.
        qs = qs.order_by("-similarity", "id")  # type: ignore[misc]
    else:
        qs = qs.order_by("id")

    items = [row_to_product(p) for p in qs[(safe_page - 1) * per : safe_page * per]]

    # Per-shop counts ignore the shop filter (match only) — same as TS:
    # useful for "search X, see which shops sell it". Evaluates on the
    # full match set even when shop_id narrows the page.
    counts_qs = models.Product.objects.all()
    if match is not None:
        counts_qs = counts_qs.filter(match)
    shop_counts = {
        row["shop_id"]: row["n"] for row in counts_qs.values("shop_id").annotate(n=Count("id"))
    }

    return {
        "items": items,
        "total": total,
        "totalPages": total_pages,
        "page": safe_page,
        "shopCounts": shop_counts,
    }
