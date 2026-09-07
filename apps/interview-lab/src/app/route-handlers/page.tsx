import { Callout, CodeBlock, DemoCard } from "../components/CodeBlock";
import { DemoShell } from "../components/DemoShell";
import { cookies, headers } from "next/headers";
import { EchoClient } from "./EchoClient";

export const metadata = { title: "Route Handlers" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  // Next 15: searchParams is a Promise
  const { q } = await searchParams;
  const c = await cookies();
  const h = await headers();
  const echoCookie = c.get("echo")?.value ?? "—";
  const ua = (h.get("user-agent") ?? "").slice(0, 60);

  return (
    <DemoShell
      title="Route Handlers (route.ts)"
      intro="For external clients, webhooks, or when you need full Request/Response control. Inside App Router, route.ts replaces pages/api."
      demo={
        <>
          <DemoCard title="Server reading (async cookies/headers/searchParams)">
            <div className="space-y-1 font-mono text-xs">
              <div>searchParams.q = {q ?? "—"}</div>
              <div>cookie echo = {echoCookie}</div>
              <div>user-agent ≈ {ua || "—"}</div>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Try <a href="/route-handlers?q=hello" className="underline">?q=hello</a> — note searchParams await.
            </p>
          </DemoCard>
          <DemoCard title="Try the handler">
            <EchoClient />
            <p className="mt-2 text-xs text-zinc-500">
              POST /route-handlers/api/echo sets a cookie; GET reads it back. Works without Server Action.
            </p>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            code={`
// app/route-handlers/api/echo/route.ts
import { cookies, headers } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  const c = await cookies()   // async in Next 15+
  const h = await headers()   // async
  return NextResponse.json({ echo: c.get("echo")?.value })
}

export async function POST(req: Request) {
  const { echo } = await req.json()
  const res = NextResponse.json({ ok: true })
  res.cookies.set("echo", echo)
  return res
}

// page.tsx — searchParams is Promise
export default async function Page({ searchParams }: { searchParams: Promise<{q?:string}> }) {
  const { q } = await searchParams
}
`}
          />
          <Callout title="Interviewer expects">
            Route Handlers = <code>route.ts</code> per HTTP method, run on Edge or Node. Use for REST/webhooks. Server
            Actions for form mutations with progressive enhancement. Next 15 broke <code>cookies()</code>/
            <code>headers()</code>/<code>searchParams</code> to async — always <code>await</code>.
          </Callout>
        </>
      }
      interview={
        <Callout title="When which?">
          Action = form mutation, wants revalidate/redirect, feels like RPC. Handler = JSON API, needs custom status or
          headers, called via <code>fetch(&quot;/api/echo&quot;)</code> from client/external.
        </Callout>
      }
    />
  );
}
