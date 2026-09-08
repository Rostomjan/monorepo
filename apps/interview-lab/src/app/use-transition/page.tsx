import { Callout, CodeBlock, DemoCard } from "../components/CodeBlock";
import { DemoShell } from "../components/DemoShell";
import { HeavyFilterDemo } from "./HeavyFilterDemo";
import { TabsDemo } from "./TabsDemo";
import { ActionDemo } from "./ActionDemo";

export const metadata = { title: "useTransition — Advanced" };

export default function Page() {
  return (
    <DemoShell
      title="useTransition — Advanced (Concurrent UI)"
      intro="useTransition marks state updates as non-urgent so React can keep urgent updates (typing, clicking) at 60fps while the expensive update renders in the background with isPending. Below: three advanced patterns you’ll be asked to whiteboard."
      demo={
        <>
          <DemoCard title="1) Expensive filter — urgent vs transition">
            <HeavyFilterDemo />
          </DemoCard>

          <DemoCard title="2) Tab switch — keep stale UI interactive">
            <TabsDemo />
          </DemoCard>

          <DemoCard title="3) Server mutation — useTransition + useOptimistic + chained awaits">
            <ActionDemo />
          </DemoCard>

          <DemoCard title="Interview checklist — when to use what">
            <ul className="space-y-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              <li>
                <b>useTransition</b> → for <em>you</em> marking an update non-urgent (input stays, list defers). Returns <code>[isPending, startTransition]</code>.
              </li>
              <li>
                <b>useDeferredValue</b> → for <em>deferring a value</em> (alternative to transition, compare in interview).
              </li>
              <li>
                Don’t wrap <b>urgent</b> updates (cursor, typing) in <code>startTransition</code> — wrap the <em>expensive</em> one.
              </li>
              <li>
                <code>isPending</code> stays true through <code>await</code>s inside <code>startTransition(async () =&gt; await ...)</code> — great for server actions.
              </li>
              <li>
                Combine with <code>useOptimistic</code> for instant optimistic UI that auto-reverts on server error — no manual rollback.
              </li>
            </ul>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            lang="tsx"
            code={`
// 1) Filter — keep typing urgent, defer expensive work
"use client"
import { useState, useTransition, useMemo } from "react"

export function Filter({ rows }: { rows: Row[] }) {
  const [input, setInput] = useState("")
  const [query, setQuery] = useState("")
  const [isPending, startTransition] = useTransition()
  const results = useMemo(() => expensiveFilter(rows, query), [query, rows])

  return (
    <>
      <input
        value={input}
        onChange={(e) => {
          const v = e.target.value
          setInput(v) // urgent — cursor
          startTransition(() => setQuery(v)) // transition — expensive
        }}
      />
      {isPending && <span>Updating…</span>}
      <List rows={results} dim={isPending} />
    </>
  )
}
`}
          />
          <CodeBlock
            lang="tsx"
            code={`
// 2) Tabs — stale UI + pending keeps app responsive
const [tab, setTab] = useState("overview")
const [isPending, startTransition] = useTransition()

function select(next: Tab) {
  startTransition(() => setTab(next)) // heavy HeavyChart for next tab renders concurrently
}
return (
  <>
    <button onClick={() => select("members")}>Members</button>
    {isPending && <Spinner />}
    <div style={{ opacity: isPending ? 0.6 : 1 }}>
      <HeavyChart tab={tab} />
    </div>
  </>
)
`}
          />
          <CodeBlock
            lang="tsx"
            code={`
// 3) Server action + optimistic + isPending across await — advanced + concurrent
"use client"
import { useTransition, useOptimistic, useState } from "react"

export function Likes({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState(initial)
  const [optimistic, addOptimistic] = useOptimistic(
    items,
    (s, { id, liked }: { id: string; liked: boolean }) =>
      s.map((it) => it.id === id ? { ...it, liked, likes: it.likes + (liked ? 1 : -1) } : it)
  )
  const [isPending, startTransition] = useTransition()

  function toggle(item: Item) {
    const next = !item.liked
    startTransition(async () => {
      addOptimistic({ id: item.id, liked: next }) // instant
      const res = await toggleOnServer(item.id, next) // isPending stays true
      if (res.ok) setItems((p) => p.map((it) => it.id === item.id ? { ...it, liked: next } : it))
      // on error, useOptimistic auto-reverts — just show toast
    })
  }

  // Chained awaits stay pending:
  // startTransition(async () => { await step1(); await step2() })
}
`}
          />
          <Callout title="Interviewer expects (advanced)">
            Mark the <em>expensive</em> <code>setState</code> inside <code>startTransition</code>, not the urgent one. Use <code>isPending</code> to dim/skeleton the stale UI. For async, <code>startTransition(async () =&gt; await ...)</code> keeps pending through the await — no extra loading state needed. Pair with <code>useOptimistic</code> for instant + auto-revert. Mention React Compiler avoids manual memo.
          </Callout>
        </>
      }
      interview={
        <Callout title="Gotchas & follow-ups">
          <ul className="space-y-1">
            <li>
              <code>useTransition</code> vs <code>useDeferredValue</code>: former marks the <em>update</em>, latter defers the <em>value</em>. Pick based on who owns the state.
            </li>
            <li>Don’t create “pending for everything” — scope it per feature; global pending hurts UX.</li>
            <li>
              In Next.js App Router, Server Actions already work with <code>startTransition</code> for mutations — but <code>useActionState</code> also gives pending internally.
            </li>
            <li>Activity keeps state hidden but mounted; transition keeps UI responsive while hidden work renders — complementary.</li>
          </ul>
        </Callout>
      }
    />
  );
}
