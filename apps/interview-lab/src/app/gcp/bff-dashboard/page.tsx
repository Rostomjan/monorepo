import { Callout, CodeBlock, DemoCard } from "../../components/CodeBlock";
import { DemoShell } from "../../components/DemoShell";
import { SummaryDemo } from "./SummaryDemo";

export const metadata = { title: "BFF: Status Dashboard" };

export default function Page() {
  return (
    <DemoShell
      title="BFF: Status Dashboard"
      intro="One frontend-shaped endpoint aggregating three GCP backends — plus a public-safe config endpoint. Both degrade per-backend (warnings[]) instead of 500ing. That graceful degradation IS the BFF pattern."
      demo={
        <>
          <DemoCard title="Try it — aggregated endpoints">
            <SummaryDemo />
            <p className="mt-2 text-xs text-zinc-500">
              Without ADC (e.g. Vercel) you get configured-but-unreachable + warnings — the degraded shape, live.
            </p>
          </DemoCard>
          <DemoCard title="Why a BFF, not 3 fetches?">
            <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
              <li>One round-trip, one loading state, one error shape for the screen.</li>
              <li>Secrets stay server-only — the Route Handler redacts before responding.</li>
              <li>Partial failure is data (<code>warnings[]</code>), not a crash.</li>
            </ul>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            lang="tsx"
            code={`
// app/gcp/bff/api/summary/route.ts — aggregate, degrade per-backend
import { NextResponse } from "next/server";

export async function GET() {
  const warnings: string[] = [];
  const storage = await tryOrWarn("storage", () => bucketMeta());
  const database = await tryOrWarn("firestore", () => probeDocs());
  const secrets = await tryOrWarn("secrets", () => secretMeta()); // metadata only, never payload
  return NextResponse.json({ data: { storage, database, secrets }, warnings });
}
// Each helper catches its own backend: { reachable: false } + warnings.push(...)
`}
          />
          <Callout title="Interviewer expects">
            BFF = server endpoint shaped for one screen, owning aggregation + redaction + degradation. Contrast: plain
            proxy (no shaping) vs gateway (cross-cutting, not screen-specific). Mention 200 + <code>warnings[]</code>{" "}
            vs 207, and that the browser never learns secret values — only reachability.
          </Callout>
        </>
      }
      interview={
        <Callout title="Mistakes to avoid">
          Don’t fan out sequentially — <code>Promise.allSettled</code> (or parallel awaits) so one slow backend
          doesn’t serialize the screen. Don’t return raw SDK errors with credentials/paths. Don’t 500 when 2 of 3
          backends are fine.
        </Callout>
      }
    />
  );
}
