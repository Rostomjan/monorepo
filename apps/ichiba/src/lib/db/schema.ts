import { integer, pgTable, text } from "drizzle-orm/pg-core";

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
