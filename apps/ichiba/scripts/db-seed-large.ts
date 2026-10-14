#!/usr/bin/env bun
// Seeds a large catalog for load-test analysis (the 1M-row benchmark behind
// the BitmapOr comment in src/lib/catalog.ts). Same deterministic
// generateCatalog fixture as db-seed.ts, so ids stay index-based
// (shop-N, shop-N-pM) and the k6 shop-{1..40}-p{1..30} range remains valid
// at any scale. Existing rows are never overwritten (ON CONFLICT DO NOTHING).
//
// Usage: DATABASE_URL=... bun scripts/db-seed-large.ts [shops] [perShop] [--yes]
//   default 1000 1000 = 1,000,000 products (reproduces the local ichiba_big db).
//   Without --yes it only prints the plan and exits (safe to run anywhere).
//
// Target a disposable database: a Neon branch for preview runs, or a local
// scratch db (createdb ichiba_seedtest + db-migrate). Never prod — 1M rows
// change what shoppers see and invalidate current baselines.
//
// Memory: the full product list is materialized once (~a few hundred MB at
// 1M rows). Inserts run in 2000-row chunks; ANALYZE refreshes planner stats
// at the end (required for the search benchmark to hold).
import postgres from "postgres";
import { generateCatalog } from "../src/lib/catalog";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const yes = process.argv.includes("--yes");
const nums = process.argv.slice(2).filter((a) => a !== "--yes").map(Number);
const shopCount = nums[0] ?? 1000;
const perShop = nums[1] ?? 1000;
if (!Number.isInteger(shopCount) || shopCount < 1 || !Number.isInteger(perShop) || perShop < 1) {
  console.error("shops and perShop must be positive integers.");
  process.exit(1);
}

// Never print the password: user@host:port/db only.
function describeTarget(u: string): string {
  try {
    const p = new URL(u);
    return `${p.username}@${p.host}${p.pathname}`;
  } catch {
    return "<unparseable>";
  }
}

const total = shopCount * perShop;
console.log(`plan: ${shopCount} shops x ${perShop} products = ${total.toLocaleString()} products -> ${describeTarget(url)}`);
if (!yes) {
  console.log("dry run: pass --yes to write. No rows touched.");
  process.exit(0);
}

const started = Date.now();
const { shops: s, products: p } = generateCatalog(shopCount, perShop);
console.log(`generated ${(p.length).toLocaleString()} products in ${((Date.now() - started) / 1000).toFixed(1)}s`);

const sql = postgres(url, { max: 1 });
await sql`INSERT INTO shops ${sql(s.map((x) => ({ id: x.id, name: x.name })))} ON CONFLICT (id) DO NOTHING`;

const CHUNK = 2000;
let done = 0;
for (let i = 0; i < p.length; i += CHUNK) {
  const chunk = p
    .slice(i, i + CHUNK)
    .map((x) => ({ id: x.id, shop_id: x.shopId, name: x.name, price_yen: x.priceYen, stock: x.stock }));
  await sql`INSERT INTO products ${sql(chunk)} ON CONFLICT (id) DO NOTHING`;
  done += chunk.length;
  if (done % (CHUNK * 10) === 0 || done === p.length) {
    console.log(`inserted ${done.toLocaleString()} / ${p.length.toLocaleString()} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
  }
}
// Same load-test anchor as db-seed.ts (k6 checkout range stays deep-stocked).
await sql`UPDATE products SET stock = 100000 WHERE id = 'shop-1-p1'`;
await sql`ANALYZE shops`;
await sql`ANALYZE products`;
const [{ shops: shopTotal }] = await sql`SELECT COUNT(*)::int AS shops FROM shops`;
const [{ products: productTotal }] = await sql`SELECT COUNT(*)::int AS products FROM products`;
console.log(`done in ${((Date.now() - started) / 1000).toFixed(0)}s: ${shopTotal} shops, ${productTotal} products total`);
await sql.end();
