"use client";

import { useState, useTransition, useMemo } from "react";

type Tab = "overview" | "members" | "billing";

function HeavyChart({ tab }: { tab: Tab }) {
  // Simulate expensive render: compute primes / layout thrash per tab
  const rows = useMemo(() => {
    const start = performance.now();
    // Busy work ~ 15-25ms to mimic chart layout + table virtualization
    let x = 0;
    for (let i = 0; i < 2_000_000; i++) x += Math.sqrt(i) % 7;
    // Use tab to change output so React treats as different tree
    const count = tab === "overview" ? 120 : tab === "members" ? 240 : 80;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      v: Math.floor((x + i * 13) % 100),
    }));
    // We intentionally log busy time as data attribute for interview explanation
    void start;
  }, [tab]);

  return (
    <div className="space-y-2">
      <div className="text-xs font-mono text-zinc-500">Heavy chart for tab=&quot;{tab}&quot; — computed {rows.length} points</div>
      <div className="grid grid-cols-12 gap-1">
        {rows.map((r) => (
          <div key={r.id} className="h-6 rounded bg-indigo-500/80 dark:bg-indigo-600" style={{ opacity: 0.3 + (r.v % 70) / 100 }} title={`${r.v}`} />
        ))}
      </div>
    </div>
  );
}

export function TabsDemo() {
  const [tab, setTab] = useState<Tab>("overview");
  const [isPending, startTransition] = useTransition();

  function onTab(next: Tab) {
    // Mark tab switch as transition — previous tab stays interactive with stale UI + pending flag
    startTransition(() => setTab(next));
  }

  return (
    <div className="rounded-lg border p-3 dark:border-zinc-800">
      <div className="flex flex-wrap gap-1">
        {(["overview", "members", "billing"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => onTab(t)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ${
              tab === t ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "border dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            }`}
          >
            {t}
          </button>
        ))}
        <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${isPending ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isPending ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
          {isPending ? "transition pending — old tab still interactive" : "idle"}
        </span>
      </div>

      <div className={`mt-4 rounded-lg border bg-white p-3 dark:bg-zinc-900 dark:border-zinc-800 ${isPending ? "opacity-60" : ""}`}>
        {isPending && <div className="mb-2 text-xs text-amber-600">Rendering next tab in background… try clicking input below — it stays responsive.</div>}
        <HeavyChart tab={tab} />
        <input placeholder="Try typing while tab is pending — input never blocks" className="mt-3 w-full rounded-md border px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800" />
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
        <code>startTransition(() =&gt; setTab(next))</code> tells React: keep current <code>tab</code> visible and interactive while the heavy <code>HeavyChart</code> renders off-priority. Without it, the whole app freezes until the new tab commits.
      </p>
    </div>
  );
}
