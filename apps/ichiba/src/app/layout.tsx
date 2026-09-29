import type { Metadata } from "next";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { cartCount } from "@/lib/cart";
import { mergeGuestCart, readCart } from "@/lib/cart-store";
import "./globals.css";

const ichibaFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-ichiba",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ichiba — Stage 2",
  description: "Simplified Rakuten Ichiba for scaling lessons: browse, search, cart, mock checkout.",
};

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand font-kanji text-[22px] font-extrabold text-on-brand shadow-sm">
        市
      </span>
      <span className="text-[22px] font-bold tracking-tight text-ink">ICHIBA</span>
    </Link>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Server-rendered cart count: correct on first paint, refreshed by cart
  // Server Actions via layout revalidation — no client badge state to sync.
  // Guest carts fold into the user cart once, right after sign-in.
  await mergeGuestCart();
  const count = cartCount(await readCart());
  return (
    <html lang="en">
      <body className={`${ichibaFont.variable} min-h-screen bg-canvas font-sans text-ink antialiased`}>
        <ClerkProvider>
          <header className="bg-white">
            <div className="mx-auto flex max-w-[76rem] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4">
              <Logo />
              <form method="GET" action="/" className="order-3 flex w-full items-center gap-2 rounded-full bg-strip p-1 pl-4 lg:order-2 lg:w-auto lg:flex-1" role="search">
                <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden className="shrink-0 fill-muted">
                  <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.8" fill="none" />
                  <path d="m11 11 3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <input
                  name="q"
                  placeholder="Search authentic regional crafts…"
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-on-brand hover:bg-brand-deep"
                >
                  Search
                </button>
              </form>
              <div className="order-2 ml-auto flex items-center gap-4 text-sm lg:order-3 lg:ml-0">
                <nav className="flex items-center gap-4 font-semibold text-nav">
                  <Link href="/" className="hidden sm:inline hover:text-ink">
                    Vendors
                  </Link>
                  <Link href="/orders" className="hover:text-ink">
                    Orders
                  </Link>
                  <Link href="/cart" className="relative inline-flex items-center gap-1.5 hover:text-ink" aria-label={`Cart, ${count} items`}>
                    <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden className="fill-current">
                      <path
                        d="M1.5 2.5h2l2.4 8.2a1 1 0 0 0 1 .8h6.9a1 1 0 0 0 1-.8L16.5 6.5H5.6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="6.5" cy="13.5" r="1.2" />
                      <circle cx="13.5" cy="13.5" r="1.2" />
                    </svg>
                    <span className="hidden sm:inline">Cart</span>
                    {count > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-on-brand">
                        {count}
                      </span>
                    )}
                  </Link>
                </nav>
                <span className="h-6 w-px bg-divider" aria-hidden />
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className="font-semibold text-nav hover:text-ink">Sign In</button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="rounded-full bg-filter-active px-4 py-2 font-semibold text-ink hover:bg-pill">
                      Sign Up
                    </button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <UserButton />
                </Show>
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-[76rem] px-4">{children}</main>
          <footer className="mt-16 bg-white">
            <div className="mx-auto grid max-w-[76rem] grid-cols-2 gap-8 px-4 py-12 md:grid-cols-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand font-kanji text-lg font-bold text-on-brand">
                    市
                  </span>
                  <span className="text-lg font-bold text-ink">ICHIBA</span>
                </div>
                <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-muted">
                  Discover authentic Japanese regional craftsmanship, heritage snacks, textiles, and masterworks.
                </p>
              </div>
              <nav aria-label="Marketplace">
                <h3 className="text-lg font-semibold text-ink">Marketplace</h3>
                <ul className="mt-3 space-y-2 text-[15px] text-muted">
                  <li><Link href="/" className="hover:text-ink">All products</Link></li>
                  <li><Link href="/cart" className="hover:text-ink">Cart</Link></li>
                  <li><Link href="/orders" className="hover:text-ink">Orders</Link></li>
                </ul>
              </nav>
              <nav aria-label="Orders and support">
                <h3 className="text-lg font-semibold text-ink">Orders &amp; Support</h3>
                <ul className="mt-3 space-y-2 text-[15px] text-muted">
                  <li><Link href="/orders" className="hover:text-ink">Track orders</Link></li>
                  <li><Link href="/cart" className="hover:text-ink">Shipping &amp; dispatch</Link></li>
                  <li><Link href="/orders" className="hover:text-ink">Buyer protection</Link></li>
                </ul>
              </nav>
              <nav aria-label="Sell on Ichiba">
                <h3 className="text-lg font-semibold text-ink">Sell on Ichiba</h3>
                <ul className="mt-3 space-y-2 text-[15px] text-muted">
                  <li><Link href="/" className="hover:text-ink">Apply as Guild Merchant</Link></li>
                  <li><Link href="/" className="hover:text-ink">Artisan councils</Link></li>
                  <li><Link href="/" className="hover:text-ink">Provenance standard</Link></li>
                </ul>
              </nav>
            </div>
            <div className="border-t border-strip">
              <div className="mx-auto flex max-w-[76rem] flex-wrap items-center justify-between gap-3 px-4 py-4 text-[13px] text-muted">
                <p>© 2025 Ichiba Digital Market Ltd. Crafted with authentic heritage.</p>
                <div className="flex gap-5">
                  <Link href="/" className="hover:text-ink">Privacy Policy</Link>
                  <Link href="/" className="hover:text-ink">Terms of Service</Link>
                  <Link href="/" className="hover:text-ink">Accessibility</Link>
                </div>
              </div>
            </div>
          </footer>
        </ClerkProvider>
      </body>
    </html>
  );
}
