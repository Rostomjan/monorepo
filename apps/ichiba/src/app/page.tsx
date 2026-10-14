import Link from "next/link";
import { FilterPill, ProductCard } from "@repo/ui";
import { listShops, queryProducts, type Product, type Shop } from "@/lib/catalog";
import { QuickAdd } from "@/components/QuickAdd";

interface SearchParams {
  q?: string;
  page?: string;
  shop?: string;
  sort?: string;
  view?: string;
}

const PER_PAGE = 12;

// Vercel Full Route Cache replaces nginx `proxy_cache_valid 200 60s`:
// listing staleness matches the 60s unstable_cache TTL in catalog.ts
// (checkout re-validates stock atomically, so this can never oversell).
export const revalidate = 60;

function hrefWith(base: SearchParams, overrides: Partial<SearchParams>): string {
  const params = new URLSearchParams();
  const merged = { ...base, ...overrides };
  for (const [k, v] of Object.entries(merged)) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

function yen(n: number): string {
  return `¥${Math.round(n).toLocaleString()}`;
}

export default async function Page({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const sp = (await searchParams) ?? {};
  const q = sp.q ?? "";
  const shopId = sp.shop ?? "";
  const sort = sp.sort ?? "featured";
  const view = sp.view ?? "grid";
  const pageNum = Number(sp.page ?? "1") || 1;

  const searching = q.trim().length > 0;
  // Independent queries fire together: one fewer sequential DB round trip.
  // Unknown shop ids filter to empty (rather than silently listing all).
  // A DB blip (e.g. rotated DATABASE_URL, Sentry 7766142040) degrades to an
  // "unavailable" notice instead of a 500: checkout re-validates stock
  // atomically, so serving no results here can never oversell.
  let shops: Shop[] = [];
  let pageItems: Product[] = [];
  let total = 0;
  let totalPages = 1;
  let safePage = pageNum;
  let shopCounts: Record<string, number> = {};
  let catalogDown = false;
  try {
    const [s, r] = await Promise.all([
      listShops(),
      queryProducts({ q, shopId: shopId || undefined, sort, page: pageNum, perPage: PER_PAGE }),
    ]);
    shops = s;
    pageItems = r.items;
    total = r.total;
    totalPages = r.totalPages;
    safePage = r.page;
    shopCounts = r.shopCounts;
  } catch {
    catalogDown = true;
  }
  const shopFilter = shops.find((s) => s.id === shopId);
  const shopNameById = new Map(shops.map((s) => [s.id, s.name]));

  const pillShops = shops.slice(0, 4);
  const start = (safePage - 1) * PER_PAGE;

  const pages: number[] = [];
  for (let p = 1; p <= totalPages && pages.length < 5; p++) {
    if (p <= 3 || p === totalPages || Math.abs(p - safePage) <= 1) pages.push(p);
  }

  return (
    <div className="space-y-6 py-6">
      {/* Query metadata + breadcrumb strip */}
      <section className="rounded-xl bg-strip p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-muted">
              <Link href="/" className="hover:text-ink">MARKETPLACE</Link>
              <span aria-hidden> / </span>
              <span className="text-ink">SEARCH RESULTS</span>
            </p>
            <h1 className="mt-2 text-[28px] font-bold leading-9 text-ink">
              {searching ? (
                <>Results for &ldquo;{q}&rdquo;</>
              ) : shopFilter ? (
                <>{shopFilter.name}</>
              ) : (
                <>All products</>
              )}{" "}
              <span className="text-[15px] font-normal text-muted">
                — {total} authentic regional {total === 1 ? "item" : "items"} found
              </span>
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-ink shadow-sm">
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden className="fill-success">
                <path d="M8 1 9.8 5.4 14.5 5.6 10.9 8.7 12 13.4 8 10.9 4 13.4 5.1 8.7 1.5 5.6 6.2 5.4Z" />
              </svg>
              All Direct From Artisan Guilds
            </span>
            <span className="inline-flex items-center gap-2 rounded-lg bg-pill px-3 py-2 text-xs font-semibold text-muted">
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden className="fill-muted">
                <path d="M1 4h12v8H1zM13 6h2l1 2v4h-3" stroke="currentColor" strokeWidth="1.4" fill="none" />
                <circle cx="4.5" cy="13" r="1.4" />
                <circle cx="11.5" cy="13" r="1.4" />
              </svg>
              Free Express from ¥10,000
            </span>
          </div>
        </div>
      </section>

      {/* Filter chips, sort, view */}
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold tracking-wider text-muted">FILTER SHOP:</span>
            <FilterPill label="All Shops" active={!shopFilter} href={hrefWith(sp, { shop: "", page: "" })} />
            {pillShops.map((s) => (
              <FilterPill
                key={s.id}
                label={s.name}
                count={shopCounts[s.id] ?? 0}
                active={s.id === shopFilter?.id}
                href={hrefWith(sp, { shop: s.id, page: "" })}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold tracking-wider text-muted">SORT BY:</span>
            <form method="GET" className="flex items-center gap-2">
              {q && <input type="hidden" name="q" value={q} />}
              {shopId && <input type="hidden" name="shop" value={shopId} />}
              {view !== "grid" && <input type="hidden" name="view" value={view} />}
              <select
                name="sort"
                defaultValue={sort}
                aria-label="Sort products"
                className="rounded-lg bg-strip px-3 py-2 text-sm font-semibold text-ink shadow-sm outline-none"
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </select>
              <button type="submit" className="rounded-lg bg-strip px-3 py-2 text-sm font-semibold text-muted hover:text-ink">
                Apply
              </button>
            </form>
            <div className="flex rounded-lg bg-strip p-1" role="group" aria-label="Change layout">
              <Link
                href={hrefWith(sp, { view: "grid" })}
                aria-label="Grid view"
                aria-current={view !== "list" || undefined}
                className={`rounded p-1.5 ${view !== "list" ? "bg-white text-brand-deep shadow-sm" : "text-muted"}`}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden fill="currentColor">
                  <rect x="1" y="1" width="6" height="6" rx="1" />
                  <rect x="9" y="1" width="6" height="6" rx="1" />
                  <rect x="1" y="9" width="6" height="6" rx="1" />
                  <rect x="9" y="9" width="6" height="6" rx="1" />
                </svg>
              </Link>
              <Link
                href={hrefWith(sp, { view: "list" })}
                aria-label="List view"
                aria-current={view === "list" || undefined}
                className={`rounded p-1.5 ${view === "list" ? "bg-white text-brand-deep shadow-sm" : "text-muted"}`}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden fill="currentColor">
                  <rect x="1" y="2" width="14" height="3" rx="1" />
                  <rect x="1" y="7" width="14" height="3" rx="1" />
                  <rect x="1" y="12" width="14" height="3" rx="1" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Active filters + count */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(searching || shopFilter) && (
            <>
              <span className="text-[11px] font-bold tracking-wider text-muted">ACTIVE:</span>
              {searching && (
                <Link
                  href={hrefWith(sp, { q: "", page: "" })}
                  className="inline-flex items-center gap-2 rounded-full bg-filter-active px-3 py-1 text-xs font-semibold text-ink hover:bg-pill"
                >
                  Query: &ldquo;{q}&rdquo;
                  <span aria-hidden>✕</span>
                </Link>
              )}
              {shopFilter && (
                <Link
                  href={hrefWith(sp, { shop: "", page: "" })}
                  className="inline-flex items-center gap-2 rounded-full bg-filter-active px-3 py-1 text-xs font-semibold text-ink hover:bg-pill"
                >
                  {shopFilter.name}
                  <span aria-hidden>✕</span>
                </Link>
              )}
              <Link href="/" className="text-xs font-semibold text-muted underline hover:text-ink">
                Clear all
              </Link>
            </>
          )}
        </div>
        <p className="text-[13px] text-muted">
          Showing {total === 0 ? 0 : start + 1}-{Math.min(start + PER_PAGE, total)} of {total} items
        </p>
      </div>

      {/* Product grid */}
      {catalogDown ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm" role="alert">
          <p className="font-semibold text-ink">Catalog temporarily unavailable</p>
          <p className="mt-1 text-sm text-muted">
            We couldn&apos;t reach the product database. Your cart and orders are safe.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-full bg-brand px-5 py-2 text-sm font-semibold text-on-brand hover:bg-brand-deep"
          >
            Try again
          </Link>
        </div>
      ) : pageItems.length > 0 ? (
        <ul
          className={
            view === "list"
              ? "grid grid-cols-1 gap-4"
              : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          }
        >
          {pageItems.map((p, i) => (
            <li key={p.id}>
              <ProductCard
                shopName={shopNameById.get(p.shopId) ?? p.shopId}
                name={p.name}
                href={`/products/${p.id}`}
                priceLabel={yen(p.priceYen)}
                compareAtLabel={i % 3 === 0 ? yen(Math.round((p.priceYen * 1.24) / 10) * 10) : undefined}
                badge={i % 2 === 0 ? "JAPAN CRAFT" : undefined}
                stockText={p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
                lowStock={p.stock > 0 && p.stock <= 5}
                action={<QuickAdd key={p.id} productId={p.id} />}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl bg-white p-8 text-center text-muted shadow-sm">
          No products found. Try clearing your filters.
        </p>
      )}

      {/* Trust strip + pagination */}
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 16 16" className="fill-white">
              <path d="M6.5 11.5 3 8l1.4-1.4 2.1 2.1 5.1-5.1L13 5z" />
            </svg>
          </span>
          <div>
            <p className="font-semibold text-ink">100% Regional Authenticity</p>
            <p className="text-[13px] text-muted">Every merchant on Ichiba is verified by domestic prefectural handicraft councils.</p>
          </div>
        </div>
        {totalPages > 1 && (
          <nav className="flex items-center gap-1.5" aria-label="Pagination">
            <Link
              href={hrefWith(sp, { page: String(Math.max(1, safePage - 1)) })}
              aria-label="Previous page"
              aria-disabled={safePage <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-pill font-bold text-muted hover:bg-filter-active hover:text-ink"
            >
              ←
            </Link>
            {pages.map((p) => (
              <Link
                key={p}
                href={hrefWith(sp, { page: String(p) })}
                aria-label={`Page ${p}`}
                aria-current={p === safePage ? "page" : undefined}
                className={
                  p === safePage
                    ? "flex h-9 w-9 items-center justify-center rounded-lg bg-brand font-bold text-on-brand"
                    : "flex h-9 w-9 items-center justify-center rounded-lg font-semibold text-muted hover:bg-pill hover:text-ink"
                }
              >
                {p}
              </Link>
            ))}
            <Link
              href={hrefWith(sp, { page: String(Math.min(totalPages, safePage + 1)) })}
              aria-label="Next page"
              aria-disabled={safePage >= totalPages}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-pill font-bold text-muted hover:bg-filter-active hover:text-ink"
            >
              →
            </Link>
          </nav>
        )}
      </section>

      {/* Artisan banner */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-filter-active p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand font-kanji text-[22px] font-bold text-on-brand">
            和
          </span>
          <div>
            <h2 className="text-lg font-semibold text-ink">Are you an artisan or certified studio?</h2>
            <p className="text-[15px] text-muted">
              Connect directly with international collectors looking for authentic Japanese regional masterworks.
            </p>
          </div>
        </div>
        <Link
          href="/"
          className="rounded-lg bg-dark px-5 py-2.5 text-sm font-semibold text-on-dark shadow-sm hover:opacity-90"
        >
          Apply as Guild Merchant
        </Link>
      </section>
    </div>
  );
}
