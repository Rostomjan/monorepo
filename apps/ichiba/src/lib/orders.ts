import { desc, eq, inArray } from "drizzle-orm";
import { getProduct, getShop } from "./catalog";
import { db } from "./db/client";
import { orderItems, orders, products, shops } from "./db/schema";

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

// Postgres-backed store. Reads reassemble orders + items; writes go
// through checkoutCart below — never bare inserts.
async function assemble(heads: Array<{
  id: string;
  userId: string;
  shopId: string;
  shopName: string;
  totalYen: number;
  createdAt: string;
}>): Promise<Order[]> {
  if (heads.length === 0) return [];
  const lines = await db()
    .select()
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        heads.map((h) => h.id),
      ),
    )
    .orderBy(orderItems.productId);
  const byOrder = new Map<string, OrderItem[]>();
  for (const l of lines) {
    const list = byOrder.get(l.orderId) ?? [];
    list.push({ productId: l.productId, name: l.name, priceYen: l.priceYen, qty: l.qty });
    byOrder.set(l.orderId, list);
  }
  return heads.map((h) => ({
    id: h.id,
    userId: h.userId,
    shopId: h.shopId,
    shopName: h.shopName,
    items: byOrder.get(h.id) ?? [],
    totalYen: h.totalYen,
    createdAt: h.createdAt,
  }));
}

export async function listOrders(userId?: string): Promise<Order[]> {
  const heads = await db()
    .select()
    .from(orders)
    .where(userId === undefined ? undefined : eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
  return assemble(heads);
}

export async function getOrder(id: string, userId?: string): Promise<Order | undefined> {
  const [order] = await assemble(await db().select().from(orders).where(eq(orders.id, id)).limit(1));
  if (!order) return undefined;
  if (userId !== undefined && order.userId !== userId) return undefined;
  return order;
}

// Atomic checkout: validate + lock rows + decrement stock + split into
// per-shop orders + persist, all in one transaction. Concurrent checkouts
// for the same product serialize on the row lock instead of overselling.
export async function checkoutCart(lines: CheckoutLine[], userId = "guest"): Promise<Order[]> {
  if (lines.length === 0 || lines.length > 50) throw new Error("items must be a non-empty array (max 50)");
  return db().transaction(async (tx) => {
    const seen = new Map<string, { id: string; shopId: string; name: string; priceYen: number }>();
    for (const line of lines) {
      if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > 99) {
        throw new Error(`bad qty for ${line.productId}`);
      }
      const [product] = await tx.select().from(products).where(eq(products.id, line.productId)).for("update").limit(1);
      if (!product) throw new Error(`unknown product: ${line.productId}`);
      if (line.qty > product.stock) throw new Error(`insufficient stock for ${line.productId}`);
      await tx
        .update(products)
        .set({ stock: product.stock - line.qty })
        .where(eq(products.id, line.productId));
      seen.set(product.id, product);
    }
    const txLookup: CatalogLookup = {
      product: async (id) => seen.get(id),
      shopName: async (shopId) =>
        (await tx.select({ name: shops.name }).from(shops).where(eq(shops.id, shopId)).limit(1))[0]?.name,
    };
    const split = await splitCartToOrders(lines, userId, txLookup);
    for (const o of split) {
      await tx.insert(orders).values({
        id: o.id,
        userId: o.userId,
        shopId: o.shopId,
        shopName: o.shopName,
        totalYen: o.totalYen,
        createdAt: o.createdAt,
      });
      await tx.insert(orderItems).values(
        o.items.map((it) => ({ orderId: o.id, productId: it.productId, name: it.name, priceYen: it.priceYen, qty: it.qty })),
      );
    }
    return split;
  });
}
