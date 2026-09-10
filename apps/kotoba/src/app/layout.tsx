import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const jp = Noto_Sans_JP({ subsets: ["latin"], variable: "--font-jp", display: "swap" });

export const metadata: Metadata = {
  title: "kotoba — offline Japanese vocab",
  description: "Paste Japanese, auto-enrich offline, flashcards with SRS. 100% offline study.",
  appleWebApp: { capable: true, title: "kotoba" },
};

export const viewport: Viewport = { themeColor: "#007bff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jp.variable}>
      <body className="min-h-screen bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
          <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
            <Link href="/" className="font-bold">
              言葉 kotoba
            </Link>
            <nav className="flex gap-1 text-sm">
              <Link className="rounded px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800" href="/add">
                Add
              </Link>
              <Link className="rounded px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800" href="/library">
                Library
              </Link>
              <Link className="rounded px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800" href="/review">
                Review
              </Link>
            </nav>
          </div>
        </header>
        <div className="mx-auto max-w-4xl px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
