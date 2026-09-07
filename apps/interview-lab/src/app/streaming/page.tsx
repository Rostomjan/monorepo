import { Suspense } from "react";
import { Callout, CodeBlock, DemoCard } from "../components/CodeBlock";
import { DemoShell } from "../components/DemoShell";
import { Slow } from "./Slow";

export const metadata = { title: "Streaming & Suspense" };

function Fallback({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed p-4 text-sm text-zinc-500 dark:border-zinc-700">
      Loading {label}…
    </div>
  );
}

export default function Page() {
  return (
    <DemoShell
      title="Streaming & Suspense"
      intro="Next streams RSC output. loading.tsx shows instantly; Suspense boundaries fill in as data resolves — no client waterfall, no blocking."
      demo={
        <>
          <DemoCard title="Shell renders immediately">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              This card and the header rendered on first byte. Slow chunks below streamed in.
            </p>
          </DemoCard>
          <Suspense fallback={<Fallback label="slow A (1.5s)" />}>
            <Slow delayMs={1500} label="Slow A" />
          </Suspense>
          <Suspense fallback={<Fallback label="slow B (2.5s)" />}>
            <Slow delayMs={2500} label="Slow B" />
          </Suspense>
          <DemoCard title="Why it matters">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Without Suspense, the whole page waits for the slowest fetch. With boundaries, fast parts are interactive
              immediately. Great for interview: explains TTFB vs FCP.
            </p>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            code={`
// app/streaming/loading.tsx — shown instantly while page loads
export default function Loading() {
  return <Skeleton />
}

// app/streaming/page.tsx
import { Suspense } from "react"
export default function Page() {
  return (
    <>
      <Header /> {/* instant */}
      <Suspense fallback={<Skeleton />}>
        <SlowData /> {/* streams when ready */}
      </Suspense>
    </>
  )
}

async function SlowData() {
  const data = await fetch("...", { cache: "no-store" })
  return <div>{data.title}</div>
}
            `}
          />
          <Callout title="Interviewer expects">
            Streaming = React 18 Suspense on server. <code>loading.tsx</code> is the route-level Suspense fallback.
            Wrap slow components individually to avoid blocking siblings. Mention selective hydration — client hydrates
            streamed HTML incrementally.
          </Callout>
        </>
      }
      interview={
        <Callout title="Gotchas">
          Don&apos;t wrap the whole page in one Suspense if parts have different latency. Prefer parallel fetches with
          Promise.all inside RSC, or separate boundaries per widget. loading.tsx only at segment level — nested
          boundaries give finer control.
        </Callout>
      }
    />
  );
}
