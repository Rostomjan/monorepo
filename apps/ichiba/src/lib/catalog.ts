import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "./db/client";
import { products, shops } from "./db/schema";

export interface Shop {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  shopId: string;
  name: string;
  priceYen: number;
  stock: number;
}

// Deterministic PRNG so seed data is stable across restarts.
// Used by scripts/db-seed.ts (same ids as the old in-memory catalog) and by
// unit tests as fixtures. The app itself always reads from Postgres.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ADJECTIVES = ["Classic", "Premium", "Eco", "Compact", "Deluxe", "Smart", "Handmade", "Limited"];
const NOUNS = ["Matcha Set", "Rice Cooker", "Backpack", "Sneakers", "Tea Pot", "Headphones", "Kimono", "Knife Set", "Lantern", "Plush Toy"];

export function generateCatalog(shopCount = 40, productsPerShop = 30, seed = 42): { shops: Shop[]; products: Product[] } {
  const rand = mulberry32(seed);
  const shops: Shop[] = Array.from({ length: shopCount }, (_, i) => ({
    id: `shop-${i + 1}`,
    name: `Shop ${i + 1} ${ADJECTIVES[Math.floor(rand() * ADJECTIVES.length)]}`,
  }));
  const products: Product[] = [];
  for (const shop of shops) {
    for (let j = 0; j < productsPerShop; j++) {
      const n = NOUNS[Math.floor(rand() * NOUNS.length)];
      const a = ADJECTIVES[Math.floor(rand() * ADJECTIVES.length)];
      const id = `${shop.id}-p${j + 1}`;
      products.push({
        id,
        shopId: shop.id,
        name: `${a} ${n} ${j + 1}`,
        priceYen: 500 + Math.floor(rand() * 20000),
        stock: 1 + Math.floor(rand() * 50),
      });
    }
  }
  return { shops, products };
}

export async function getShop(id: string): Promise<Shop | undefined> {
  const rows = await db().select().from(shops).where(eq(shops.id, id)).limit(1);
  return rows[0];
}

export async function getProduct(id: string): Promise<Product | undefined> {
  const rows = await db().select().from(products).where(eq(products.id, id)).limit(1);
  return rows[0];
}

export async function getProducts(ids: string[]): Promise<Map<string, Product>> {
  if (ids.length === 0) return new Map();
  const rows = await db().select().from(products).where(inArray(products.id, ids));
  return new Map(rows.map((p) => [p.id, p]));
}

export async function listShops(): Promise<Shop[]> {
  return db().select().from(shops).orderBy(asc(shops.id));
}

// LIKE metacharacters in user input must not become wildcards.
function likePattern(q: string): string {
  return `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
}

// Typo-tolerant match: exact substring (ILIKE, uses no index but is precise)
// plus trigram similarity (GIN-indexed) for near-misses.
function matchCondition(q: string) {
  const t = q.trim();
  if (!t) return undefined;
  return or(ilike(products.name, likePattern(t)), sql`similarity(${products.name}, ${t}) > 0.12`);
}

// queryProducts is the single source for listing semantics (filter + sort
// + paginate + per-shop counts).

export interface ProductQuery {
  q?: string;
  shopId?: string;
  sort?: string;
  page?: number;
  perPage?: number;
}

export interface ProductQueryResult {
  items: Product[];
  total: number;
  totalPages: number;
  page: number;
  shopCounts: Map<string, number>;
}

function sortOrder(sort: string | undefined, q: string) {
  if (sort === "price-asc") return [asc(products.priceYen), asc(products.id)] as const;
  if (sort === "price-desc") return [desc(products.priceYen), asc(products.id)] as const;
  if (q) return [sql`similarity(${products.name}, ${q}) DESC`, asc(products.id)] as const;
  return [asc(products.id)] as const;
}

export async function queryProducts(opts: ProductQuery): Promise<ProductQueryResult> {
  const q = (opts.q ?? "").trim();
  const perPage = Math.min(Math.max(opts.perPage ?? 12, 1), 60);
  const match = matchCondition(q);
  const where = opts.shopId ? and(match, eq(products.shopId, opts.shopId)) : match;

  // Count first so the page clamps to range (same contract as the old
  // in-memory listProducts); items + per-shop counts follow in parallel.
  const countRows = await db().select({ n: count() }).from(products).where(where);
  const total = countRows[0]?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(opts.page ?? 1, 1), totalPages);

  const [itemRows, shopRows] = await Promise.all([
    db()
      .select()
      .from(products)
      .where(where)
      .orderBy(...sortOrder(opts.sort, q))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db().select({ shopId: products.shopId, n: count() }).from(products).where(match).groupBy(products.shopId),
  ]);

  return {
    items: itemRows,
    total,
    totalPages,
    page,
    shopCounts: new Map(shopRows.map((r) => [r.shopId, r.n])),
  };
}
