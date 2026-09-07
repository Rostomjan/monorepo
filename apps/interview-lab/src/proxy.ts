import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // Demo: inject header for observability
  const res = NextResponse.next();
  res.headers.set("x-lab-middleware", "hit");

  // Demo guard: /middleware/secret requires ?allow=1 or cookie lab_allow=1
  // (kept alongside Clerk — Clerk runs first, then custom logic)
  if (pathname.startsWith("/middleware/secret")) {
    const allow = req.nextUrl.searchParams.get("allow") === "1" || req.cookies.get("lab_allow")?.value === "1";
    if (!allow) {
      const url = req.nextUrl.clone();
      url.pathname = "/middleware";
      url.searchParams.set("blocked", "1");
      return NextResponse.redirect(url);
    }
  }

  return res;
});

export const config = {
  matcher: [
    // Clerk + Next.js recommended matcher (skip static assets)
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
