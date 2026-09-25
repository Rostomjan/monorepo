#!/usr/bin/env bun
// Generates a large catalog JSON for load-test analysis (Stage-3 DB lesson).
// Usage: bun scripts/seed-large.ts [shops] [perShop]  (default 1000 100 = 100k products)
import { generateCatalog } from "../src/lib/catalog";

const shops = Number(process.argv[2] ?? "1000");
const perShop = Number(process.argv[3] ?? "100");
const { shops: s, products: p } = generateCatalog(shops, perShop);
console.log(JSON.stringify({ shops: s.length, products: p.length, sample: p.slice(0, 2) }));
