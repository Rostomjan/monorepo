import { getProduct, getShop } from "./catalog";

export interface OrderItem {
  productId: string;
  name: string;
  priceYen: number;
  qty: number;
}

export interface Order {
  id: string;
  shopId: string;
  shopName: string;
  items: OrderItem[];
  totalYen: number;
  createdAt: string;
}

export interface CheckoutLine {
  productId: string;
  qty: number;
}

// Pure: split a mixed-shop cart into one Order per Shop (Ichiba rule).
export function splitCartToOrders(lines: CheckoutLine[]): Order[] {
  const byShop = new Map<string, OrderItem[]>();
  for (const line of lines) {
    const product = getProduct(line.productId);
    if (!product) throw new Error(`unknown product: ${line.productId}`);
    if (line.qty <= 0 || line.qty > 99) throw new Error(`bad qty for ${line.productId}`);
    const items = byShop.get(product.shopId) ?? [];
    items.push({ productId: product.id, name: product.name, priceYen: product.priceYen, qty: line.qty });
    byShop.set(product.shopId, items);
  }
  const now = new Date().toISOString();
  return [...byShop.entries()].map(([shopId, items], i) => ({
    id: `order-${Date.now()}-${i}-${Math.floor(Math.random() * 1e6)}`,
    shopId,
    shopName: getShop(shopId)?.name ?? shopId,
    items,
    totalYen: items.reduce((n, it) => n + it.priceYen * it.qty, 0),
    createdAt: now,
  }));
}

// Single-instance store (Stage-1 baseline).
// Scaling hook: this breaks with 2+ instances — Stage-5 moves it to Postgres/Redis.
const ORDER_DB: Order[] = [];

export function placeOrders(orders: Order[]): void {
  ORDER_DB.unshift(...orders);
}

export function listOrders(): Order[] {
  return ORDER_DB;
}

export function getOrder(id: string): Order | undefined {
  return ORDER_DB.find((o) => o.id === id);
}
