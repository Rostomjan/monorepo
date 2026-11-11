import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { backendBaseUrl, currentCatalogBackend, type RemoteBackendId } from "./backend";
import { remoteListShops, remoteQueryProducts } from "./catalog-remote";
import { dbRead } from "./db/client";
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
  return cachedShop(id);
}

export async function getProduct(id: string): Promise<Product | undefined> {
  return cachedProduct(id);
}

// Entity lookups are cacheable (5 min TTL): names/prices change rarely, and
// the only stock-sensitive path (checkout) re-checks atomically with
// SELECT … FOR UPDATE, so a stale read can only surface a friendly 409.
const cachedShop = unstable_cache(
  async (id: string) => (await dbRead().select().from(shops).where(eq(shops.id, id)).limit(1))[0],
  ["ichiba-shop"],
  { revalidate: 300 },
);

const cachedProduct = unstable_cache(
  async (id: string) => (await dbRead().select().from(products).where(eq(products.id, id)).limit(1))[0],
  ["ichiba-product"],
  { revalidate: 300 },
);

const cachedShops = unstable_cache(() => dbRead().select().from(shops).orderBy(asc(shops.id)), ["ichiba-shops"], {
  revalidate: 300,
});

export async function getProducts(ids: string[]): Promise<Map<string, Product>> {
  if (ids.length === 0) return new Map();
  const rows = await dbRead().select().from(products).where(inArray(products.id, ids));
  return new Map(rows.map((p) => [p.id, p]));
}

export async function listShops(): Promise<Shop[]> {
  const backend = await currentCatalogBackend();
  if (backend !== "ts") {
    try {
      return await cachedRemoteShops(backend)();
    } catch (err) {
      console.error(`${backend} catalog read failed; falling back to the drizzle path`, err);
    }
  }
  return cachedShops();
}

// A remote twin's listing read, cached under a distinct per-backend key
// with the same 60s staleness contract as the drizzle path. A transient
// failure of the twin's service (down, slow, 500) uncaches nothing —
// retry/fallback lands on the drizzle path, which computes the identical
// result from the DB.
const cachedRemoteShops = (backend: RemoteBackendId) =>
  unstable_cache(() => remoteListShops(backendBaseUrl(backend)), ["ichiba-shops", backend], {
    revalidate: 60,
  });

// LIKE metacharacters in user input must not become wildcards.
function likePattern(q: string): string {
  return `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
}

// Typo-tolerant match as two bitmap-capable branches (combined via BitmapOr
// at scale): exact substring plus the trigram % operator at its default 0.3
// threshold. A `similarity() > const` function clause would poison the whole
// OR into a seqscan, and lowering the threshold needs ALTER DATABASE (a
// superuser-only op that won't run on managed/pooled Postgres) — so exact
// recall comes from the ILIKE branch instead, and the % branch adds moderate
// typos. Measured at 1M rows: BitmapOr ≈100–190ms vs seqscan ≈360ms.
function matchCondition(q: string) {
  const t = q.trim();
  if (!t) return undefined;
  return or(ilike(products.name, likePattern(t)), sql`${products.name} % ${t}`);
}

// queryProducts is the single source for listing semantics (filter + sort
// + paginate + per-shop counts) AS a function of the backend selector:
// whichever implementation runs, the contract tests lock both to the same
// statuses, shapes and error strings. Cache keys are per-backend, so a
// flag flip mid-flight can never mix cached results computed by the two.
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
  shopCounts: Record<string, number>;
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
  const backend = await currentCatalogBackend();
  if (backend !== "ts") {
    try {
      return await cachedQueryRemote(backend)(
        q,
        opts.shopId ?? "",
        opts.sort ?? "featured",
        Math.max(opts.page ?? 1, 1),
        perPage,
      );
    } catch (err) {
      console.error(`${backend} catalog read failed; falling back to the drizzle path`, err);
    }
  }
  return cachedQuery(q, opts.shopId ?? "", opts.sort ?? "featured", Math.max(opts.page ?? 1, 1), perPage);
}

// The remote twin's listing read, cached under a distinct per-backend key
// with the same 60s staleness contract as the drizzle path. Cache keys
// carry the backend, so a flag flip mid-flight can never mix cached
// results computed by two implementations.
const cachedQueryRemote =
  (backend: RemoteBackendId) =>
  unstable_cache(
    async (q: string, shopId: string, sort: string, page: number, perPage: number): Promise<ProductQueryResult> =>
      remoteQueryProducts({ q, shopId: shopId || undefined, sort, page, perPage }, backendBaseUrl(backend)),
    ["ichiba-query", backend],
    { revalidate: 60 },
  );

// Listing results cache 60s: same staleness contract as the entity caches
// (checkout re-validates stock atomically, so this can never oversell).
const cachedQuery = unstable_cache(
  async (q: string, shopId: string, sort: string, page: number, perPage: number): Promise<ProductQueryResult> => {
    const match = matchCondition(q);
    const where = shopId ? and(match, eq(products.shopId, shopId)) : match;

    // Count first so the page clamps to range (same contract as the old
    // in-memory listProducts); items + per-shop counts follow in parallel.
    const countRows = await dbRead().select({ n: count() }).from(products).where(where);
    const total = countRows[0]?.n ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const safePage = Math.min(Math.max(page, 1), totalPages);

    const [itemRows, shopRows] = await Promise.all([
      dbRead()
        .select()
        .from(products)
        .where(where)
        .orderBy(...sortOrder(sort, q))
        .limit(perPage)
        .offset((safePage - 1) * perPage),
      dbRead().select({ shopId: products.shopId, n: count() }).from(products).where(match).groupBy(products.shopId),
    ]);

    return {
      items: itemRows,
      total,
      totalPages,
      page: safePage,
      shopCounts: Object.fromEntries(shopRows.map((r) => [r.shopId, r.n])),
    };
  },
  ["ichiba-query"],
  { revalidate: 60 },
);
