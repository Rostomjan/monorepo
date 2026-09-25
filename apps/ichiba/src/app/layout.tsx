import type { Metadata } from "next";
import Link from "next/link";
import { CartLink } from "@/components/CartLink";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ichiba — Stage 1 baseline",
  description: "Simplified Rakuten Ichiba for scaling lessons: browse, search, cart, mock checkout.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-zinc-900">
        <header className="border-b">
          <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 p-4">
            <Link href="/" className="text-xl font-bold text-ichiba">
              Ichiba <span className="text-xs font-normal text-zinc-500">stage-1</span>
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/orders">Orders</Link>
              <CartLink />
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl p-4">{children}</main>
      </body>
    </html>
  );
}
