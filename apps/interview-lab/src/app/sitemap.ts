import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://interview-lab.vercel.app";
  const routes = [
    "",
    "/rsc",
    "/streaming",
    "/caching",
    "/server-actions",
    "/parallel-intercepting",
    "/route-handlers",
    "/middleware",
    "/metadata",
    "/performance",
    "/view-transitions",
    "/activity",
  ];
  return routes.map((r) => ({
    url: `${base}${r}`,
    lastModified: new Date(),
  }));
}
