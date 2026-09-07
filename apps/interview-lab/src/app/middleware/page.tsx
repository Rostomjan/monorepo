import { headers } from "next/headers";
import { Callout, CodeBlock, DemoCard } from "../components/CodeBlock";
import { DemoShell } from "../components/DemoShell";

export const metadata = { title: "Middleware" };

export default async function Page({ searchParams }: { searchParams: Promise<{ blocked?: string }> }) {
  const { blocked } = await searchParams;
  const h = await headers();
  const hit = h.get("x-lab-middleware") ?? "—";

  return (
    <DemoShell
      title="Middleware (Edge)"
      intro="Runs before your route — auth, redirects, rewrites, header injection — on the Edge. Configured via matcher."
      demo={
        <>
          <DemoCard title="Live header from middleware">
            <div className="font-mono text-xs">x-lab-middleware = {hit}</div>
            <p className="mt-1 text-xs text-zinc-500">
              Set in <code>src/middleware.ts</code>. Check DevTools → Network → Response headers.
            </p>
          </DemoCard>
          <DemoCard title="Guard demo">
            <p className="text-sm">
              <a href="/middleware/secret" className="underline">
                /middleware/secret
              </a>{" "}
              is protected. Without <code>?allow=1</code> you get redirected here.
            </p>
            {blocked && <p className="mt-2 text-sm text-amber-600">Blocked — redirect from middleware. Try ?allow=1.</p>}
            <div className="mt-3 flex gap-2 text-sm">
              <a href="/middleware/secret" className="rounded-md border px-3 py-1.5">
                Try blocked
              </a>
              <a href="/middleware/secret?allow=1" className="rounded-md bg-indigo-600 px-3 py-1.5 text-white">
                Try allowed (?allow=1)
              </a>
            </div>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            code={`
// src/middleware.ts
import { NextResponse } from "next/server"
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/middleware/secret")) {
    const allow = req.nextUrl.searchParams.get("allow")==="1"
    if (!allow) {
      const url = req.nextUrl.clone()
      url.pathname = "/middleware"
      url.searchParams.set("blocked","1")
      return NextResponse.redirect(url)
    }
  }
  const res = NextResponse.next()
  res.headers.set("x-lab-middleware","hit")
  return res
}
export const config = { matcher: ["/middleware/:path*"] }
`}
          />
          <Callout title="Interviewer expects">
            Middleware runs on Edge before routing, can read cookies/headers, rewrite/redirect, add headers. Lightweight
            — no DB heavy work. Matcher limits cost. For auth, check session cookie here and redirect to login. Mention
            Edge vs Node runtime trade-offs.
          </Callout>
        </>
      }
      interview={
        <Callout title="Pitfalls">
          Middleware is not a replacement for server auth checks — always re-check in RSC/Route Handler. It runs on
          every matched request, so keep it fast and avoid fetching.
        </Callout>
      }
    />
  );
}
