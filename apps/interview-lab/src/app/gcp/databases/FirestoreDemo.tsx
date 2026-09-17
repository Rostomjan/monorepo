"use client";

import { useState } from "react";
import { probeFirestore } from "./actions";

export function FirestoreDemo() {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onProbe() {
    setBusy(true);
    try {
      const r = await probeFirestore();
      setStatus(r.ok ? r.message : r.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-zinc-500">
        Writes + reads + deletes one tiny doc in <code className="font-mono">lab_probes</code> (collection auto-created,
        doc removed after — zero retained, free tier).
      </p>
      <button
        onClick={onProbe}
        disabled={busy}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {busy ? "Probing…" : "Test live Firestore"}
      </button>
      {status && <p className="text-xs text-zinc-600 dark:text-zinc-400">{status}</p>}
    </div>
  );
}
