import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Docs - Monorepo",
  description: "Second site sharing @repo/ui and @repo/tokens",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
