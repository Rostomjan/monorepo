"use client";

import { Activity, useState } from "react";

function Counter({ label }: { label: string }) {
  const [n, setN] = useState(0);
  const [text, setText] = useState("");
  return (
    <div className="rounded-lg border bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{label}</div>
      <div className="mt-2 flex items-center gap-2">
        <button onClick={() => setN((v) => v - 1)} className="rounded border px-2 py-1 text-sm">
          −
        </button>
        <span className="w-8 text-center font-mono text-sm">{n}</span>
        <button onClick={() => setN((v) => v + 1)} className="rounded bg-zinc-900 px-2 py-1 text-sm text-white">
          +
        </button>
      </div>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="type to test preservation"
        className="mt-2 w-full rounded border px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
      />
      <div className="mt-1 text-xs text-zinc-500">count={n} · text=&quot;{text}&quot;</div>
    </div>
  );
}

export function ActivityVsConditional() {
  const [tab, setTab] = useState<"a" | "b">("a");
  const [mode, setMode] = useState<"activity" | "conditional">("activity");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border p-1 text-xs dark:border-zinc-700">
          <button
            onClick={() => setMode("activity")}
            className={`rounded-full px-3 py-1 font-medium ${mode === "activity" ? "bg-zinc-900 text-white" : ""}`}
          >
            Activity
          </button>
          <button
            onClick={() => setMode("conditional")}
            className={`rounded-full px-3 py-1 font-medium ${mode === "conditional" ? "bg-zinc-900 text-white" : ""}`}
          >
            Conditional
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab("a")}
            className={`rounded-md px-3 py-1.5 text-sm ${tab === "a" ? "bg-indigo-600 text-white" : "border"}`}
          >
            Tab A
          </button>
          <button
            onClick={() => setTab("b")}
            className={`rounded-md px-3 py-1.5 text-sm ${tab === "b" ? "bg-indigo-600 text-white" : "border"}`}
          >
            Tab B
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {mode === "activity" ? (
          <>
            <Activity mode={tab === "a" ? "visible" : "hidden"}>
              <Counter label="Panel A (Activity)" />
            </Activity>
            <Activity mode={tab === "b" ? "visible" : "hidden"}>
              <Counter label="Panel B (Activity)" />
            </Activity>
          </>
        ) : (
          <>
            {tab === "a" && <Counter label="Panel A (conditional)" />}
            {tab === "b" && <Counter label="Panel B (conditional)" />}
          </>
        )}
      </div>

      <p className="text-xs leading-relaxed text-zinc-500">
        <b>{mode === "activity" ? "Activity" : "Conditional"}</b>: {mode === "activity"
          ? "both panels stay mounted; hidden one keeps count & input. Switch tabs — state preserved, hidden tree deprioritized."
          : "only active tab mounts; switching unmounts and resets count/input. Try incrementing then switching."}
      </p>
    </div>
  );
}
