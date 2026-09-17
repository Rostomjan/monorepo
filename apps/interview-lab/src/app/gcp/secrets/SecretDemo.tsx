"use client";

import { useState } from "react";
import { readPracticeSecret } from "./actions";

export function SecretDemo() {
  const [result, setResult] = useState<Awaited<ReturnType<typeof readPracticeSecret>> | null>(null);
  const [busy, setBusy] = useState(false);

  async function onRead() {
    setBusy(true);
    try {
      setResult(await readPracticeSecret());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-zinc-500">
        Reads <code className="font-mono">LAB_PRACTICE_SECRET</code> (dummy value) server-only. Nothing secret is
        shown — only a masked preview + length.
      </p>
      <button
        onClick={onRead}
        disabled={busy}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {busy ? "Reading…" : "Read practice secret (live)"}
      </button>
      {result?.ok && (
        <div className="rounded-md bg-zinc-50 p-2 font-mono text-xs dark:bg-zinc-800">
          <div>
            masked: <b>{result.masked}</b>
          </div>
          <div>length: {result.length}</div>
          <div className="mt-1 font-sans text-zinc-500">{result.note}</div>
        </div>
      )}
      {result && !result.ok && <p className="text-xs text-red-600 dark:text-red-400">{result.error}</p>}
    </div>
  );
}
