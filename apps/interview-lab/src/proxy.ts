import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Demo: protect /middleware/secret, else just add a header
export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Example: inject request id header for observability
  const res = NextResponse.next();
  res.headers.set("x-lab-middleware", "hit");

  // Demo guard: /middleware/secret requires ?allow=1 or cookie lab_allow=1
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
}

export const config = {
  matcher: ["/middleware/:path*", "/route-handlers/:path*"],
};
