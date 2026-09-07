import Image from "next/image";
import Script from "next/script";
import { Callout, CodeBlock, DemoCard } from "../components/CodeBlock";
import { DemoShell } from "../components/DemoShell";

export const metadata = { title: "Performance" };

export default function Page() {
  return (
    <DemoShell
      title="Performance — Image, Fonts, Scripts, PPR"
      intro="LCP/CLS wins: next/image with priority & sizes, next/font with variable, next/script strategies, and Next 16 cacheComponents/PPR."
      demo={
        <>
          <DemoCard title="next/image — priority for LCP">
            <div className="overflow-hidden rounded-lg border">
              <Image
                src="https://picsum.photos/seed/lab/800/400"
                alt="Demo image"
                width={800}
                height={400}
                priority
                sizes="(max-width: 768px) 100vw, 800px"
                className="h-auto w-full"
              />
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              <code>priority</code> preloads LCP image, <code>sizes</code> avoids oversized downloads, avoids CLS with
              fixed width/height.
            </p>
          </DemoCard>
          <DemoCard title="next/font & next/script">
            <p className="text-sm">
              Font loaded via <code>next/font/google</code> (Geist) in <code>layout.tsx</code> with{" "}
              <code>display: &quot;swap&quot;</code> — no layout shift. Script below uses <code>afterInteractive</code>.
            </p>
            <Script src="https://example.com/fake-analytics.js" strategy="afterInteractive" />
            <p className="mt-2 text-xs text-zinc-500">Check Network → script loads after hydration.</p>
          </DemoCard>
          <DemoCard title="PPR / cacheComponents (Next 16)">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Enable in <code>next.config.mjs</code>: <code>experimental: &#123; cacheComponents: true &#125;</code> or{" "}
              <code>ppr: &quot;incremental&quot;</code>. Static shell streams, dynamic holes Suspense-streamed — best LCP
              + dynamic.
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              This Lab has it enabled — see next.config.mjs. For interview: “PPR = static + dynamic in same route”.
            </p>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            code={`
// next/image — always set width/height + sizes, priority for above-fold
import Image from "next/image"
<Image src="/hero.jpg" width={1200} height={630} priority sizes="100vw" alt="Hero" />

// next/font — in layout.tsx
import { Geist } from "next/font/google"
const geist = Geist({ subsets: ["latin"], display: "swap", variable: "--font-geist" })

// next/script
import Script from "next/script"
<Script src="https://analytics.example.com/app.js" strategy="afterInteractive" />
// strategies: beforeInteractive | afterInteractive | lazyOnload | worker

// next.config.mjs — Next 16
export default {
  experimental: { cacheComponents: true }, // or ppr: "incremental"
}
`}
          />
          <Callout title="Interviewer expects">
            CLS: size images, font display swap. LCP: priority preload, preconnect. Script: don&apos;t block with{" "}
            <code>beforeInteractive</code>. PPR/cacheComponents lets one route have static shell + dynamic Suspense
            islands — no need to choose per-route static vs dynamic.
          </Callout>
        </>
      }
      interview={
        <Callout title="Metrics">
          Mention Web Vitals: LCP (image priority), CLS (dimensions), INP (avoid blocking scripts), and Turbopack dev
          speed (Next 16 default).
        </Callout>
      }
    />
  );
}
