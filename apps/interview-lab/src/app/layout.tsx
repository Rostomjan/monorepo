import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Next.js Interview Lab — Latest Features Playground",
    template: "%s | Interview Lab",
  },
  description:
    "Hands-on playground for Next.js 16 / React 19 latest features — RSC, Server Actions, Caching, Streaming, PPR, Activity and more. Built for interview prep.",
  metadataBase: new URL("https://interview-lab.vercel.app"),
};

function Nav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-zinc-950/80 dark:border-zinc-800">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold text-white">
            N
          </span>
          <span>interview-lab</span>
          <span className="hidden sm:inline-flex ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
            Next 16 · React 19
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Dashboard
          </Link>
          <a
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex rounded-md px-3 py-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            Docs
          </a>
        </nav>
      </div>
    </header>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-zinc-50 antialiased dark:bg-zinc-950">
        <Nav />
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
        <footer className="mx-auto max-w-6xl px-4 py-10 text-center text-xs text-zinc-500 dark:text-zinc-500">
          Built with Next.js 16, React 19, Tailwind v4 · Interview prep playground · No tests per spec
        </footer>
      </body>
    </html>
  );
}
