import "./globals.css";
import { ConvexClientProvider } from "../lib/convex-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Monorepo Web App - Powered by Next.js",
  description: "A modern monorepo web application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
