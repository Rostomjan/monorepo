import { Callout, CodeBlock, DemoCard } from "../components/CodeBlock";
import { DemoShell } from "../components/DemoShell";
import { Counter } from "./Counter";

export const metadata = { title: "RSC vs Client" };

// Simulated server fetch — stays on server, never shipped to client
async function getServerTime() {
  await new Promise((r) => setTimeout(r, 200));
  return new Date().toISOString();
}

export default async function Page() {
  const serverTime = await getServerTime();

  return (
    <DemoShell
      title="RSC vs Client Components"
      intro="RSC renders on the server. It fetches data without useEffect, ships zero JS for server-only code, and composes with small client islands for interactivity."
      demo={
        <>
          <DemoCard title="Server Component (this page)">
            <div className="space-y-2 text-sm">
              <div className="rounded-md bg-zinc-50 p-3 font-mono text-xs dark:bg-zinc-800">
                serverTime: {serverTime}
              </div>
              <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                This timestamp was fetched on the server (RSC). View source — no client JS needed to render it. No
                useEffect, no loading spinner.
              </p>
            </div>
          </DemoCard>
          <DemoCard title="Client Island">
            <Counter />
            <p className="mt-2 text-xs text-zinc-500">
              Only this island is client JS. Parent stays server. Props passed from server must be serializable.
            </p>
          </DemoCard>
          <DemoCard title="Composition tip">
            <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
              <li>
                Keep data fetching in RSC; pass result to client via props/children.
              </li>
              <li>
                <code>use client</code> at top of file marks the boundary — everything below is client.
              </li>
              <li>
                Don&apos;t put &quot;use client&quot; on layout — it would make entire subtree client.
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
// app/rsc/page.tsx — Server Component (default, no "use client")
async function getServerTime() { return new Date().toISOString(); }

export default async function Page() {
  const serverTime = await getServerTime(); // direct await, no useEffect
  return (
    <>
      <div>{serverTime}</div>
      <Counter /> {/* client island */}
    </>
  )
}

// app/rsc/Counter.tsx
"use client";
import { useState } from "react";
export function Counter() {
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n+1)}>{n}</button>
}
`}
          />
          <Callout title="Interviewer expects">
            RSC = server-only, zero JS, can be async. Client = &quot;use client&quot;, has state/effects. Never fetch in
            useEffect when RSC can do it — RSC avoids waterfall and reduces bundle. Props RSC→client must be
            serializable. Mention React Compiler avoids manual memo.
          </Callout>
        </>
      }
      interview={
        <Callout title="Common follow-ups">
          Q: When must you use client? A: state, effects, browser APIs, event handlers. Q: Can client import server? A:
          No — server can import client (as children), not reverse. Q: Where does Tailwind run? Both, but global CSS
          imported in layout.
        </Callout>
      }
    />
  );
}
