import Link from "next/link";
import { getProduct, getShop } from "@/lib/catalog";
import { removeFromCart, setLineQty } from "@/lib/cart-actions";
import { readCart } from "@/lib/cart-store";
import { CheckoutForm } from "./CheckoutForm";

const KANJI_NUMERALS = ["壱", "弐", "参", "四", "伍", "陸", "七", "八", "九", "十"];

function yen(n: number): string {
  return `¥${n.toLocaleString()}`;
}

// Server-rendered from the cookie cart: correct on first paint, and every
// mutation revalidates through Server Actions — no client cart state to sync.
export async function CartView() {
  const cart = await readCart();

  if (cart.length === 0) {
    return (
      <div className="space-y-4 py-6">
        <h1 className="text-[28px] font-bold text-ink">Shopping Cart</h1>
        <p className="rounded-xl bg-white p-8 text-center text-muted shadow-sm">
          Your cart is empty. <Link href="/" className="font-semibold text-brand-deep underline">Browse the marketplace</Link>
        </p>
      </div>
    );
  }

  const byShop = new Map<string, { productId: string; qty: number }[]>();
  for (const line of cart) {
    const product = getProduct(line.productId);
    if (!product) continue;
    const list = byShop.get(product.shopId) ?? [];
    list.push(line);
    byShop.set(product.shopId, list);
  }
  const groups = [...byShop.entries()].map(([shopId, lines], i) => {
    const subtotal = lines.reduce((n, l) => n + (getProduct(l.productId)?.priceYen ?? 0) * l.qty, 0);
    return { shopId, shopName: getShop(shopId)?.name ?? shopId, lines, subtotal, numeral: KANJI_NUMERALS[i % KANJI_NUMERALS.length] };
  });

  const itemCount = cart.reduce((n, l) => n + l.qty, 0);
  const total = groups.reduce((n, g) => n + g.subtotal, 0);

  return (
    <div className="space-y-6 py-6">
      {/* Breadcrumbs + title */}
      <div>
        <p className="text-[11px] font-bold tracking-wider text-muted">
          <Link href="/" className="hover:text-ink">MARKETPLACE</Link>
          <span aria-hidden> / </span>
          <span className="text-ink">ORDER CONSOLIDATION</span>
          <span aria-hidden> • </span>
          <span className="text-brand-deep">
            {groups.length} {groups.length === 1 ? "MERCHANT" : "MERCHANTS"}
          </span>
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-[28px] font-bold leading-9 text-ink">
              Shopping Cart
              <span className="rounded-full bg-filter-active px-3 py-1 text-xs font-semibold text-muted">
                {itemCount} {itemCount === 1 ? "Item" : "Items"}
              </span>
            </h1>
            <p className="mt-2 flex items-center gap-2 rounded-lg bg-filter-active px-3 py-2 text-[13px] font-semibold text-ink shadow-sm">
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden className="fill-brand-deep">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm-.9 10.2-3-3 1.4-1.4 1.6 1.6 4.4-4.4L10.9 5 7.1 9.8Z" />
              </svg>
              Mixed shops OK — checkout splits into one independent order per artisan shop.
            </p>
          </div>
          <p className="flex items-center gap-2 text-[13px]">
            <span className="inline-flex items-center gap-1.5 font-semibold text-success">
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden className="fill-success">
                <path d="M8 1 9.8 5.4 14.5 5.6 10.9 8.7 12 13.4 8 10.9 4 13.4 5.1 8.7 1.5 5.6 6.2 5.4Z" />
              </svg>
              100% Provenance Guaranteed
            </span>
            <span className="text-muted" aria-hidden>|</span>
            <span className="text-muted">Dispatching directly from Japan</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Shop groups */}
        <div className="space-y-6 lg:col-span-8">
          {groups.map((g) => (
            <section key={g.shopId} aria-label={g.shopName} className="overflow-hidden rounded-xl bg-white shadow-sm">
              <span className="block h-1 bg-brand" aria-hidden />
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-filter-active font-kanji text-lg font-semibold text-brand-deep">
                    {g.numeral}
                  </span>
                  <div>
                    <h2 className="font-semibold text-ink">{g.shopName}</h2>
                    <p className="text-[13px] text-muted">
                      {g.lines.length} {g.lines.length === 1 ? "item" : "items"} · Ships from Japan
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                  <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden className="fill-success">
                    <path d="M6.5 11.5 3 8l1.4-1.4 2.1 2.1 5.1-5.1L13 5z" />
                  </svg>
                  Free Insured Delivery
                </span>
              </div>

              <ul className="mx-4 space-y-3 rounded-xl bg-strip p-4">
                {g.lines.map((line) => {
                  const p = getProduct(line.productId);
                  if (!p) return null;
                  return (
                    <li key={line.productId} className="flex flex-wrap items-center gap-x-4 gap-y-3">
                      <span className="h-16 w-16 shrink-0 rounded-xl bg-pill shadow-inner" aria-hidden />
                      <div className="min-w-0 flex-1 basis-48">
                        <p className="truncate font-semibold text-ink">
                          <Link href={`/products/${p.id}`} className="hover:underline">{p.name}</Link>
                        </p>
                        <p className="text-[13px] text-muted">{yen(p.priceYen)} each</p>
                      </div>
                      <div className="ml-auto flex flex-wrap items-center gap-2">
                        <form className="flex items-center rounded-lg bg-white shadow-sm">
                          <button
                            type="submit"
                            formAction={setLineQty.bind(null, p.id, line.qty - 1)}
                            aria-label={`Decrease quantity of ${p.name}`}
                            className="px-2.5 py-1.5 font-bold text-muted hover:text-ink"
                          >
                            −
                          </button>
                          <span aria-label={`Quantity for ${p.name}`} className="w-12 border-x border-strip py-1.5 text-center text-sm font-semibold">
                            {line.qty}
                          </span>
                          <button
                            type="submit"
                            formAction={setLineQty.bind(null, p.id, Math.min(99, line.qty + 1))}
                            aria-label={`Increase quantity of ${p.name}`}
                            className="px-2.5 py-1.5 font-bold text-muted hover:text-ink"
                          >
                            +
                          </button>
                        </form>
                        <p className="w-20 text-right text-xl font-bold text-ink">{yen(p.priceYen * line.qty)}</p>
                        <form action={removeFromCart.bind(null, p.id)}>
                          <button
                            type="submit"
                            className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-muted shadow-sm hover:text-brand-deep"
                          >
                            Remove
                          </button>
                        </form>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="flex items-center justify-between p-4">
                <p className="flex items-center gap-1.5 text-[13px] text-nav">
                  <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden className="fill-success">
                    <path d="M6.5 11.5 3 8l1.4-1.4 2.1 2.1 5.1-5.1L13 5z" />
                  </svg>
                  {g.shopName} Dispatch Group
                </p>
                <p className="text-[15px] text-ink">
                  Subtotal: <strong className="text-lg font-semibold">{yen(g.subtotal)}</strong>
                </p>
              </div>
            </section>
          ))}

          {/* Trust badges */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Buyer assurances">
            {[
              { title: "Direct Atelier Packing", sub: "Inspected before dispatch", tone: "bg-success" },
              { title: "Express Regional Air", sub: "Insured multi-shop routing", tone: "bg-filter-active" },
              { title: "Buyer Protection", sub: "Full damage replacement", tone: "bg-brand" },
            ].map((b) => (
              <div key={b.title} className="rounded-xl bg-white p-4 shadow-sm">
                <span className={`inline-flex rounded-lg ${b.tone} p-2`} aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 16 16" className="fill-white">
                    <path d="M6.5 11.5 3 8l1.4-1.4 2.1 2.1 5.1-5.1L13 5z" />
                  </svg>
                </span>
                <p className="mt-2 font-semibold text-ink">{b.title}</p>
                <p className="text-[13px] text-muted">{b.sub}</p>
              </div>
            ))}
          </section>
        </div>

        {/* Summary sidebar */}
        <div className="space-y-4 lg:col-span-4">
          <section aria-label="Order summary" className="overflow-hidden rounded-xl bg-white shadow-md">
            <span className="block h-1.5 bg-brand" aria-hidden />
            <div className="space-y-4 p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold text-ink">Order Summary</h2>
                <p className="text-xs text-muted">
                  {groups.length} Multi-{groups.length === 1 ? "Order" : "Orders"}
                </p>
              </div>

              <dl className="space-y-2 text-[15px]">
                <div className="flex justify-between">
                  <dt className="text-muted">Subtotal ({itemCount} items)</dt>
                  <dd className="font-semibold text-ink">{yen(total)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Insured delivery</dt>
                  <dd className="font-semibold text-success">Free</dd>
                </div>
              </dl>

              <div className="rounded-lg bg-strip p-3">
                <p className="text-[11px] font-bold tracking-wider text-muted">SHOP SUB-SPLITS</p>
                <ul className="mt-2 space-y-1.5">
                  {groups.map((g) => (
                    <li key={g.shopId} className="flex justify-between text-sm">
                      <span className="truncate text-muted">{g.shopName}</span>
                      <span className="font-semibold text-ink">{yen(g.subtotal)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-baseline justify-between border-t border-strip pt-3">
                <p className="font-semibold text-ink">Total</p>
                <p className="text-[28px] font-extrabold text-brand-deep">{yen(total)}</p>
              </div>

              <div className="space-y-2">
                <CheckoutForm totalLabel={yen(total)} />
                <Link
                  href="/"
                  className="block w-full rounded-xl bg-filter-active py-3 text-center text-sm font-semibold text-ink shadow-sm hover:bg-pill"
                >
                  Continue shopping
                </Link>
              </div>

              <div>
                <p className="text-center text-[11px] font-bold tracking-wider text-muted">
                  SUPPORTED MULTI-VENDOR CHECKOUT
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  {["VISA", "Mastercard", "JCB", "AMEX", "Konbini"].map((m) => (
                    <span key={m} className="rounded bg-pill px-2 py-1 text-[11px] font-semibold text-muted">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-semibold text-ink">
              <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden className="fill-brand-deep">
                <path d="M2 3h12v10H2z" stroke="currentColor" strokeWidth="1.4" fill="none" />
                <path d="M2 6h12" stroke="currentColor" strokeWidth="1.4" />
              </svg>
              Multi-shop shipping note
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Items from different artisan shops ship in separate insured parcels, but you only check out once.
              Tracking for each dispatch group appears under Orders.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
