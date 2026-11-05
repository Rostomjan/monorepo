"""Cross-language fixture parity: generate_catalog(seed=42) here produces
byte-identical ids/names/prices to TS generateCatalog (same seed). Verified
against the TS truth:
  cd apps/ichiba && bun -e '<import + dump generateCatalog(40,30,42)>'
The first three rng draws below are the frozen TS reference values.
"""

from ichibaapi.catalog import generate_catalog, like_pattern, mulberry32


def test_same_seed_same_catalog_as_ts() -> None:
    shops, products = generate_catalog()
    assert shops[0] == {"id": "shop-1", "name": "Shop 1 Deluxe"}
    assert products[0] == {
        "id": "shop-1-p1",
        "shopId": "shop-1",
        "name": "Smart Backpack 1",
        "priceYen": 4690,
        "stock": 16,
    }
    # Long tail keeps TS's invariants: 40 shops × 30 products, JPY range,
    # positive stock.
    assert len(shops) == 40
    assert len(products) == 40 * 30
    assert all(p["priceYen"] >= 500 for p in products)
    assert all(p["stock"] >= 1 for p in products)


def test_rng_reference_points_frozen_from_ts() -> None:
    import pytest

    rand = mulberry32(42)
    draws = [rand() for _ in range(3)]
    # TS truth (bun, full 17-digit doubles): 0.6011037519201636,
    # 0.44829055899754167, 0.8524657934904099.
    assert draws == pytest.approx([0.6011037519201636, 0.44829055899754167, 0.8524657934904099])


def test_like_pattern_escapes_metacharacters() -> None:
    # 100% match TS likePattern() — % | _ | \ inside user input are literals.
    assert like_pattern("50%_a\\b") == r"%50\%\_a\\b%"
