interface CartLine {
  productId: string;
  qty: number;
}

export type Cart = CartLine[];

export function addLine(cart: Cart, productId: string, qty = 1): Cart {
  const found = cart.find((l) => l.productId === productId);
  if (found) {
    return cart.map((l) => (l.productId === productId ? { ...l, qty: Math.min(99, l.qty + qty) } : l));
  }
  return [...cart, { productId, qty: Math.min(99, Math.max(1, qty)) }];
}

export function setQty(cart: Cart, productId: string, qty: number): Cart {
  if (qty <= 0) return cart.filter((l) => l.productId !== productId);
  return cart.map((l) => (l.productId === productId ? { ...l, qty: Math.min(99, qty) } : l));
}

export function removeLine(cart: Cart, productId: string): Cart {
  return cart.filter((l) => l.productId !== productId);
}

export function cartCount(cart: Cart): number {
  return cart.reduce((n, l) => n + l.qty, 0);
}

// Pure validator for untrusted persisted carts (cookie JSON, API bodies).
// Never throws: malformed input becomes an empty cart.
export function parseCart(value: unknown): Cart {
  if (!Array.isArray(value)) return [];
  const out: Cart = [];
  for (const l of value) {
    if (typeof l !== "object" || l === null) continue;
    const { productId, qty } = l as { productId?: unknown; qty?: unknown };
    if (typeof productId !== "string" || productId.length === 0 || productId.length > 64) continue;
    if (!Number.isInteger(qty) || (qty as number) < 1 || (qty as number) > 99) continue;
    if (out.some((e) => e.productId === productId)) continue;
    out.push({ productId, qty: qty as number });
  }
  return out;
}
