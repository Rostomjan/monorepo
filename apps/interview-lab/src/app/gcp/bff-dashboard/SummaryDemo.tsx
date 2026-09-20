"use client";

import { useState } from "react";

export function SummaryDemo() {
  const [url, setUrl] = useState("/gcp/bff/api/summary");
  const [out, setOut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(endpoint: string) {
    setBusy(true);
    setUrl(endpoint);
    try {
      const res = await fetch(endpoint);
      setOut(JSON.stringify(await res.json(), null, 2));
    } catch (e) {
      setOut(`fetch failed: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => call("/gcp/bff/api/summary")}
          disabled={busy}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          GET summary
        </button>
        <button
          onClick={() => call("/gcp/bff/api/config")}
          disabled={busy}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
        >
          GET config
        </button>
      </div>
      <div className="font-mono text-[11px] text-zinc-500">→ {url}</div>
      {out && (
        <pre className="overflow-x-auto rounded-md bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-100">
          {out}
        </pre>
      )}
    </div>
  );
}
