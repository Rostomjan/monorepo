import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  // Next 15: cookies() and headers() are async
  const c = await cookies();
  const h = await headers();
  const echo = c.get("echo")?.value ?? null;
  const ua = h.get("user-agent") ?? null;

  return NextResponse.json({
    method: "GET",
    echoCookie: echo,
    userAgent: ua,
    now: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const c = await cookies();
  // Example: set a cookie
  const next = NextResponse.json({ ok: true, received: body });
  if (body?.echo) {
    next.cookies.set("echo", String(body.echo), { path: "/", httpOnly: false });
    // also via cookies() API in route handler:
    // (await cookies()).set(...) works too on Next 16
    c.set("echo", String(body.echo));
  }
  return next;
}
