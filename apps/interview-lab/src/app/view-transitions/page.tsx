import Link from "next/link";
import { Callout, CodeBlock, DemoCard } from "../components/CodeBlock";
import { DemoShell } from "../components/DemoShell";

export const metadata = { title: "View Transitions" };

export default function Page() {
  return (
    <DemoShell
      title="View Transitions"
      intro="Native cross-page animations without SPA hacks. Next 16 supports View Transition API — Link can opt-in per navigation."
      demo={
        <>
          <DemoCard title="Try it">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Clicking between these labs, the browser animates shared elements when View Transitions are enabled. Chrome
              111+ shows it natively; others gracefully degrade.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/" className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white">
                Go to Dashboard
              </Link>
              <Link href="/rsc" className="rounded-md border px-3 py-1.5 text-sm">
                Go to RSC
              </Link>
            </div>
          </DemoCard>
          <DemoCard title="Browser support">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Enabled via <code>experimental.viewTransition: true</code> in next.config.mjs OR per-Link. Gracefully
              no-ops if not supported.
            </p>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            code={`
// next.config.mjs
export default {
  experimental: { viewTransition: true }
}

// Per-link opt-in (Next 15.3+)
import Link from "next/link"
<Link href="/rsc" viewTransition>Go to RSC</Link>

// CSS hook
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 300ms;
}
`}
          />
          <Callout title="Interviewer expects">
            View Transitions = native browser API polyfilled via Next. Enables shared-element transitions without Framer
            hacks. Mention progressive enhancement — no JS breakage if unsupported. Useful for gallery → detail
            animations.
          </Callout>
        </>
      }
      interview={
        <Callout title="vs alternatives">
          Previously needed <code>framer-motion</code> layout transitions. View Transitions is cheaper, but still
          experimental — interview point: know fallback.
        </Callout>
      }
    />
  );
}
