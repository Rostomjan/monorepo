import type { Product, ProductQuery, ProductQueryResult, Shop } from "./catalog";
import { pythonApiBaseUrl } from "./backend";

/**
 * HTTP data layer for the ichiba-py twin (docs/DUAL_BACKEND.md). Contracts:
 * GET /api/products → ProductQueryResult, GET /api/shops → {shops: Shop[]}.
 * Both the TS and python implementations of these endpoints are asserted
 * byte-for-byte equal by contract tests on both sides, so no response
 * normalizing happens here beyond shape validation.
 *
 * TS treats any unknown sort value as the default ordering (q → similarity
 * search); the python API hard-rejects unknown sorts with HTTP 400
 * ("sort must be one of: featured, price-asc, price-desc"). Dropping them
 * before the request changes nothing observably: the python
 * query_products() applies identical default/similarity semantics for an
 * omitted sort (parity-locked), and that is exactly what the TS side does
 * for these same inputs.
 */
export function normalizeSort(sort: string | undefined): string | undefined {
  return sort === "price-asc" || sort === "price-desc" || sort === "featured" ? sort : undefined;
}

export function catalogQueryUrl(baseUrl: string, opts: ProductQuery): string {
  const base = baseUrl.replace(/\/+$/, "");
  const params = new URLSearchParams();
  const q = opts.q?.trim();
  if (q) params.set("q", q);
  if (opts.shopId) params.set("shopId", opts.shopId);
  const sort = normalizeSort(opts.sort);
  if (sort) params.set("sort", sort);
  if (opts.page) params.set("page", String(opts.page));
  if (opts.perPage) params.set("perPage", String(opts.perPage));
  const query = params.toString();
  return `${base}/api/products${query ? `?${query}` : ""}`;
}

function isProduct(v: unknown): v is Product {
  if (typeof v !== "object" || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.shopId === "string" &&
    typeof p.name === "string" &&
    typeof p.priceYen === "number" &&
    typeof p.stock === "number"
  );
}

function isProductQueryResult(v: unknown): v is ProductQueryResult {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    Array.isArray(r.items) &&
    r.items.every(isProduct) &&
    typeof r.total === "number" &&
    typeof r.totalPages === "number" &&
    typeof r.page === "number" &&
    typeof r.shopCounts === "object" &&
    r.shopCounts !== null
  );
}

async function requestJson<T>(url: string, fetchImpl: typeof fetch): Promise<T> {
  // Same staleness contract as the drizzle path's unstable_cache TTLs: a
  // 3s budget keeps a hung python service from stalling the render; the
  // catalog dispatch falls back to the canonical path on any failure.
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(3_000) });
  if (!res.ok) throw new Error(`/api call failed: ${res.status} ${res.statusText}`);
  if (!(res.headers.get("content-type") ?? "").includes("application/json")) {
    throw new Error("/api call returned a non-JSON payload");
  }
  return (await res.json()) as T;
}

export async function remoteQueryProducts(
  opts: ProductQuery,
  baseUrl = pythonApiBaseUrl(),
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<ProductQueryResult> {
  if (!baseUrl) throw new Error("ICHIBA_API_URL is not set; the python backend is not reachable");
  const data = await requestJson<unknown>(catalogQueryUrl(baseUrl, opts), fetchImpl);
  if (!isProductQueryResult(data)) throw new Error("unexpected shape from /api/products");
  return {
    items: data.items,
    total: data.total,
    totalPages: data.totalPages,
    page: data.page,
    shopCounts: data.shopCounts,
  };
}

export async function remoteListShops(
  baseUrl = pythonApiBaseUrl(),
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<Shop[]> {
  if (!baseUrl) throw new Error("ICHIBA_API_URL is not set; the python backend is not reachable");
  const data = await requestJson<{ shops: unknown }>(
    `${baseUrl.replace(/\/+$/, "")}/api/shops`,
    fetchImpl,
  );
  if (typeof data !== "object" || data === null || !Array.isArray((data as { shops: unknown }).shops)) {
    throw new Error("unexpected shape from /api/shops");
  }
  const shops = (data as { shops: unknown[] }).shops;
  if (!shops.every(isShop)) throw new Error("unexpected shop shape from /api/shops");
  return shops;
}

function isShop(v: unknown): v is Shop {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return typeof s.id === "string" && typeof s.name === "string";
}
