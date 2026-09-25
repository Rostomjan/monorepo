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

// Deterministic PRNG so seed data is stable across restarts (KISS: no DB yet).
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

// Single-instance in-memory catalog (Stage-1 baseline).
// Scaling hook: swap this module for Postgres + index in Stage-3 without touching pages.
const { shops: SHOPS, products: PRODUCTS } = generateCatalog();

const SHOP_BY_ID = new Map(SHOPS.map((s) => [s.id, s]));
const PRODUCT_BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));

export { SHOPS, PRODUCTS };

export function getShop(id: string): Shop | undefined {
  return SHOP_BY_ID.get(id);
}

export function getProduct(id: string): Product | undefined {
  return PRODUCT_BY_ID.get(id);
}

// Intentionally naive substring scan — this is the "before" for the indexing/caching lessons.
export function searchProducts(query: string, limit = 20): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return PRODUCTS.slice(0, limit);
  const out: Product[] = [];
  for (const p of PRODUCTS) {
    if (p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)) {
      out.push(p);
      if (out.length >= limit) break;
    }
  }
  return out;
}

export function listProducts(page = 1, perPage = 20): { items: Product[]; total: number; totalPages: number } {
  const total = PRODUCTS.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * perPage;
  return { items: PRODUCTS.slice(start, start + perPage), total, totalPages };
}
