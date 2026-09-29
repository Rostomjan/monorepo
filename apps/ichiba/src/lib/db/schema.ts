import { index, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

// Stage 3: catalog lives in Postgres (Neon in prod, local `db` service in
// dev). Deterministic seed ids (shop-1, shop-1-p1, …) keep product URLs,
// k6 scripts, and tests stable across the in-memory → SQL cutover.

export const shops = pgTable("shops", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  shopId: text("shop_id")
    .notNull()
    .references(() => shops.id),
  name: text("name").notNull(),
  priceYen: integer("price_yen").notNull(),
  stock: integer("stock").notNull(),
});

export type ShopRow = typeof shops.$inferSelect;
export type ProductRow = typeof products.$inferSelect;

// Stage 5 (done early): orders live in Postgres, not per-instance memory —
// required for correctness on multi-instance/serverless deployments, where
// an in-memory ORDER_DB is invisible across instances and dies on cold start.
// Items snapshot name+price at purchase (price changes never rewrite history).
export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    shopId: text("shop_id").notNull(),
    shopName: text("shop_name").notNull(),
    totalYen: integer("total_yen").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("orders_user_id_idx").on(t.userId)],
);

export const orderItems = pgTable(
  "order_items",
  {
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    name: text("name").notNull(),
    priceYen: integer("price_yen").notNull(),
    qty: integer("qty").notNull(),
  },
  (t) => [primaryKey({ columns: [t.orderId, t.productId] })],
);

export type OrderRow = typeof orders.$inferSelect;
export type OrderItemRow = typeof orderItems.$inferSelect;
