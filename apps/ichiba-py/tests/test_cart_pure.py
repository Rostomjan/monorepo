"""Parity port of apps/ichiba/src/lib/cart.test.ts — pure functions only."""

from ichibaapi.cart import add_line, cart_count, merge_carts, parse_cart


def test_adds_and_merges_lines() -> None:
    assert add_line([], "a") == [{"productId": "a", "qty": 1}]
    assert add_line([{"productId": "a", "qty": 1}], "a", 2) == [{"productId": "a", "qty": 3}]


def test_counts_quantities() -> None:
    assert cart_count([{"productId": "a", "qty": 2}, {"productId": "b", "qty": 3}]) == 5


def test_merge_carts_unions_guest_into_user_capped_at_99() -> None:
    assert merge_carts(
        [{"productId": "a", "qty": 2}],
        [{"productId": "a", "qty": 3}, {"productId": "b", "qty": 98}],
    ) == [{"productId": "a", "qty": 5}, {"productId": "b", "qty": 98}]
    assert merge_carts([{"productId": "a", "qty": 90}], [{"productId": "a", "qty": 20}]) == [
        {"productId": "a", "qty": 99}
    ]
    assert merge_carts([], []) == []


def test_parse_cart_accepts_a_well_formed_cart() -> None:
    assert parse_cart([{"productId": "shop-1-p1", "qty": 2}]) == [
        {"productId": "shop-1-p1", "qty": 2}
    ]


def test_parse_cart_rejects_malformed_entries_without_throwing() -> None:
    assert parse_cart(None) == []
    assert parse_cart("nope") == []
    assert parse_cart(
        [
            {"productId": "a", "qty": 1},
            {"productId": "", "qty": 1},
            {"productId": "b", "qty": 0},
            {"productId": "c", "qty": 100},
            {"productId": "d", "qty": 1.5},
            {"productId": "a", "qty": 2},
            "junk",
            None,
        ]
    ) == [{"productId": "a", "qty": 1}]
