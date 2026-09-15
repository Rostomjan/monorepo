import type { Metadata } from "next";
import { ConvexClientProvider } from "../lib/convex-client";
import "./globals.css";

export const metadata: Metadata = {
  title: "kanji",
  description: "Personal WaniKani-like kanji learner",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
