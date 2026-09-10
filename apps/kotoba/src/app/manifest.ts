import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "kotoba",
  description: "Offline Japanese vocabulary PWA",
  appleWebApp: { capable: true, title: "kotoba" },
};

export default function WebManifest() {
  return {
    name: "kotoba — offline Japanese vocab",
    short_name: "kotoba",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#007bff",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }],
  };
}
