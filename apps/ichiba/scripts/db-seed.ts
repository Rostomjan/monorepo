#!/usr/bin/env bun
// Seeds shops + products from the deterministic generateCatalog fixture
// (same ids as the old in-memory catalog: shop-1, shop-1-p1, …).
// Usage: DATABASE_URL=... bun scripts/db-seed.ts [shops] [perShop]
import postgres from "postgres";
import { generateCatalog } from "../src/lib/catalog";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const shops = Number(process.argv[2] ?? "40");
const perShop = Number(process.argv[3] ?? "30");
const { shops: s, products: p } = generateCatalog(shops, perShop);

const sql = postgres(url, { max: 1 });
await sql`INSERT INTO shops ${sql(s.map((x) => ({ id: x.id, name: x.name })))} ON CONFLICT (id) DO NOTHING`;
for (let i = 0; i < p.length; i += 500) {
  const chunk = p
    .slice(i, i + 500)
    .map((x) => ({ id: x.id, shop_id: x.shopId, name: x.name, price_yen: x.priceYen, stock: x.stock }));
  await sql`INSERT INTO products ${sql(chunk)} ON CONFLICT (id) DO NOTHING`;
}
const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM products`;
// Load-test anchor: k6/checkout.js buys shop-1-p1 every run and its threshold
// tolerates zero failures, so this product carries effectively infinite stock.
// Re-applied on every seed (the upserts above are DO NOTHING on conflict).
await sql`UPDATE products SET stock = 100000 WHERE id = 'shop-1-p1'`;
console.log(`seeded ${s.length} shops, ${count} products total`);
await sql.end();
