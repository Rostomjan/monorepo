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

const KEY = "ichiba_cart_v1";

export function loadCart(): Cart {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Cart;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((l) => typeof l.productId === "string" && typeof l.qty === "number" && l.qty > 0);
  } catch {
    return [];
  }
}

export function saveCart(cart: Cart): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(cart));
}

export function clearCart(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
