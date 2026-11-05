"""Cart — Python port of apps/ichiba/src/lib/cart.ts (pure functions).

The TS side is cart-as-a-cookie (cart-store.ts persists via Server Actions).
The Python backend has no cookie/session layer (no Next request object) —
cart *persistence* stays a TS-app concern; the pure domain functions are
ported because they are the parity-tested core (same tests as cart.test.ts).
"""

from typing import TypedDict


class CartLine(TypedDict):
    productId: str
    qty: int


Cart = list[CartLine]


def add_line(cart: Cart, product_id: str, qty: int = 1) -> Cart:
    for line in cart:
        if line["productId"] == product_id:
            return [
                old if old["productId"] != product_id else {**old, "qty": min(99, old["qty"] + qty)}
                for old in cart
            ]
    return [*cart, {"productId": product_id, "qty": min(99, max(1, qty))}]


def set_qty(cart: Cart, product_id: str, qty: int) -> Cart:
    if qty <= 0:
        return [line for line in cart if line["productId"] != product_id]
    return [
        old if old["productId"] != product_id else {**old, "qty": min(99, qty)}
        for old in cart
    ]


def remove_line(cart: Cart, product_id: str) -> Cart:
    return [line for line in cart if line["productId"] != product_id]


def cart_count(cart: Cart) -> int:
    return sum(line["qty"] for line in cart)


def merge_carts(user_cart: Cart, guest_cart: Cart) -> Cart:
    """Pure: fold a guest cart into a user cart (union by product, cap 99)."""
    merged = [CartLine(**line) for line in user_cart]
    for line in guest_cart:
        merged = add_line(merged, line["productId"], line["qty"])
    return merged


def parse_cart(value: object) -> Cart:
    """Pure validator for untrusted persisted carts (cookie JSON, API
    bodies). Never throws: malformed input becomes an empty cart."""
    if not isinstance(value, list):
        return []
    out: Cart = []
    for line in value:
        if not isinstance(line, dict):
            continue
        product_id = line.get("productId")
        qty = line.get("qty")
        if not isinstance(product_id, str) or not 0 < len(product_id) <= 64:
            continue
        if not isinstance(qty, int) or isinstance(qty, bool) or not 1 <= qty <= 99:
            continue
        if any(e["productId"] == product_id for e in out):
            continue
        out.append({"productId": product_id, "qty": qty})
    return out
