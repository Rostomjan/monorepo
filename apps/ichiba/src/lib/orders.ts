import { getProduct, getShop } from "./catalog";

interface OrderItem {
  productId: string;
  name: string;
  priceYen: number;
  qty: number;
}

export interface Order {
  id: string;
  // Stage 2: Clerk user id, or "guest" for signed-out checkout (Stage-1 behavior).
  userId: string;
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

// Lookup injected so unit tests run on fixtures without a database;
// production callers use the default Postgres-backed lookup.
export interface CatalogLookup {
  product: (id: string) => Promise<{ id: string; shopId: string; name: string; priceYen: number } | undefined>;
  shopName: (shopId: string) => Promise<string | undefined>;
}

const dbLookup: CatalogLookup = {
  product: (id) => getProduct(id),
  shopName: async (shopId) => (await getShop(shopId))?.name,
};

// Pure apart from the injected lookup: split a mixed-shop cart into one
// Order per Shop (Ichiba rule).
export async function splitCartToOrders(
  lines: CheckoutLine[],
  userId = "guest",
  lookup: CatalogLookup = dbLookup,
): Promise<Order[]> {
  const byShop = new Map<string, OrderItem[]>();
  for (const line of lines) {
    const product = await lookup.product(line.productId);
    if (!product) throw new Error(`unknown product: ${line.productId}`);
    if (line.qty <= 0 || line.qty > 99) throw new Error(`bad qty for ${line.productId}`);
    const items = byShop.get(product.shopId) ?? [];
    items.push({ productId: product.id, name: product.name, priceYen: product.priceYen, qty: line.qty });
    byShop.set(product.shopId, items);
  }
  const now = new Date().toISOString();
  const orders: Order[] = [];
  let i = 0;
  for (const [shopId, items] of byShop) {
    orders.push({
      id: `order-${Date.now()}-${i}-${Math.floor(Math.random() * 1e6)}`,
      userId,
      shopId,
      shopName: (await lookup.shopName(shopId)) ?? shopId,
      items,
      totalYen: items.reduce((n, it) => n + it.priceYen * it.qty, 0),
      createdAt: now,
    });
    i++;
  }
  return orders;
}

// Single-instance store (Stage-1 baseline).
// Scaling hook: this breaks with 2+ instances — Stage-5 moves it to Postgres/Redis.
const ORDER_DB: Order[] = [];

export function placeOrders(orders: Order[]): void {
  ORDER_DB.unshift(...orders);
}

export function listOrders(userId?: string): Order[] {
  if (userId === undefined) return ORDER_DB;
  return ORDER_DB.filter((o) => o.userId === userId);
}

export function getOrder(id: string, userId?: string): Order | undefined {
  const order = ORDER_DB.find((o) => o.id === id);
  if (!order) return undefined;
  if (userId !== undefined && order.userId !== userId) return undefined;
  return order;
}
