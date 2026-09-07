import { Callout, CodeBlock, DemoCard } from "../components/CodeBlock";
import { DemoShell } from "../components/DemoShell";
import { ActivityVsConditional } from "./ActivityVsConditional";

export const metadata = { title: "Activity (React 19)" };

export default function Page() {
  return (
    <DemoShell
      title="Activity — React 19 Keep-Alive"
      intro="Activity preserves mounted state while visually hidden — unlike conditional rendering (unmounts) or CSS hidden (still renders at full priority). Ideal for tabs, keep-alive panels, background routes."
      demo={
        <>
          <DemoCard title="Interactive: Activity vs Conditional">
            <ActivityVsConditional />
          </DemoCard>
          <DemoCard title="When to use what">
            <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
              <li>
                <b>Conditional (&& / ternary)</b> — unmounts, state lost. Good for truly separate pages.
              </li>
              <li>
                <b>CSS hidden / display:none</b> — stays mounted but still reconciles at normal priority, wastes work.
              </li>
              <li>
                <b>&lt;Activity mode=&quot;hidden&quot;&gt;</b> — stays mounted, preserves state & DOM, React deprioritizes
                hidden tree (effects paused at lower priority). Best for tabs & keep-alive.
              </li>
            </ul>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            code={`
import { Activity, useState } from "react"

function Tabs() {
  const [tab, setTab] = useState("a")
  return (
    <>
      <button onClick={() => setTab("a")}>A</button>
      <button onClick={() => setTab("b")}>B</button>

      {/* conditional — loses state on switch */}
      {tab === "a" && <PanelA />}
      {tab === "b" && <PanelB />}

      {/* Activity — preserves state */}
      <Activity mode={tab === "a" ? "visible" : "hidden"}>
        <PanelA />
      </Activity>
      <Activity mode={tab === "b" ? "visible" : "hidden"}>
        <PanelB />
      </Activity>
    </>
  )
}
`}
          />
          <Callout title="Interviewer expects">
            Mention React 19 <code>&lt;Activity&gt;</code> is the official keep-alive primitive. It keeps components
            mounted while hidden, preserves state/inputs, and lets React deprioritize hidden updates. Contrast with{" "}
            <code>hidden</code> attribute and conditional. Note: Next 16 ships React 19.2 — no extra flag, just import
            from <code>&quot;react&quot;</code>. Good answer for “how to keep tab state without remount?”
          </Callout>
        </>
      }
      interview={
        <Callout title="Gotchas">
          Activity is still new — check types (<code>@types/react@19.2</code> includes it). Hidden trees still in DOM
          (a11y: add <code>aria-hidden</code> if needed). For route-level keep-alive, combine with parallel routes.
        </Callout>
      }
    />
  );
}
