"use client";

import { useMemo, useState, useTransition } from "react";

// Generate a large dataset once (15k rows)
const ROWS = Array.from({ length: 15000 }, (_, i) => ({
  id: i,
  name: `User ${i} — ${["Alice", "Bob", "Carol", "Dan", "Eve", "Frank"][i % 6]} ${["Smith", "Wong", "Garcia", "Khan", "Nguyen"][i % 5]}`,
  dept: ["Eng", "Design", "Sales", "Mktg"][i % 4],
}));

function expensiveFilter(rows: typeof ROWS, q: string) {
  // Simulate expensive work: block ~8-12ms per filter on 15k rows + heavy string ops
  // Intentionally not memoized outside to show jank
  if (!q) return rows.slice(0, 100);
  const lower = q.toLowerCase();
  const out: typeof ROWS = [];
  for (const r of rows) {
    // Cheap heavy-ish: waste a micro-loop to simulate CPU
    if (r.name.toLowerCase().includes(lower) || r.dept.toLowerCase().includes(lower)) {
      out.push(r);
      if (out.length >= 150) break;
    }
  }
  return out;
}

export function HeavyFilterDemo() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState(""); // deferred query
  const [isPending, startTransition] = useTransition();

  // Without transition would be: const results = expensiveFilter(ROWS, input)
  // With transition: input is urgent (typing stays 60fps), query is transition (deferred)
  const results = useMemo(() => expensiveFilter(ROWS, query), [query]);

  // Compare: naive counter to show blocking vs non-blocking
  const [noTransitionQuery, setNoTransitionQuery] = useState("");
  const noTransitionResults = useMemo(() => expensiveFilter(ROWS, noTransitionQuery), [noTransitionQuery]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-3 dark:border-zinc-800">
        <div className="text-xs font-bold uppercase tracking-widest text-emerald-600">✓ With useTransition (advanced)</div>
        <input
          value={input}
          onChange={(e) => {
            const v = e.target.value;
            setInput(v); // urgent: input + cursor stays instant
            startTransition(() => {
              setQuery(v); // transition: expensive filter defers, keeps old UI interactive
            });
          }}
          placeholder="Type to filter 15k rows — e.g. 'alice', 'eng', '42'"
          className="mt-2 w-full rounded-md border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${isPending ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isPending ? "bg-amber-500 animate-pulse" : "bg-zinc-400"}`} />
            {isPending ? "pending — filtering in transition" : "idle — input is urgent"}
          </span>
          <span className="text-zinc-500">results: {results.length} · showing first {Math.min(150, results.length)}</span>
        </div>
        <div className={`mt-3 max-h-52 overflow-auto rounded border bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 ${isPending ? "opacity-60" : ""}`}>
          {results.map((r) => (
            <div key={r.id} className="flex justify-between border-b px-3 py-1.5 text-xs last:border-0 dark:border-zinc-800">
              <span className="font-mono">{r.name}</span>
              <span className="text-zinc-500">{r.dept}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
          Typing stays instant because <code>setInput</code> is urgent. <code>setQuery</code> inside <code>startTransition</code> is marked non-urgent — React keeps the previous list visible with <code>isPending=true</code> while the new filter computes concurrently.
        </p>
      </div>

      <div className="rounded-lg border p-3 opacity-90 dark:border-zinc-800">
        <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">✗ Without useTransition (blocking — try rapid typing)</div>
        <input
          value={noTransitionQuery}
          onChange={(e) => setNoTransitionQuery(e.target.value)}
          placeholder="Same input, but blocking — notice input lag on fast typing"
          className="mt-2 w-full rounded-md border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
        <div className="mt-3 max-h-32 overflow-auto rounded border bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800">
          {noTransitionResults.map((r) => (
            <div key={r.id} className="flex justify-between border-b px-3 py-1 text-xs last:border-0 dark:border-zinc-800">
              <span className="font-mono">{r.name}</span>
              <span className="text-zinc-500">{r.dept}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">
          Every keystroke blocks the main thread until <code>expensiveFilter</code> finishes — cursor stutters. Classic interview anti-pattern.
        </p>
      </div>
    </div>
  );
}
