"use client";

import { useState } from "react";
import { createUploadTicket } from "./actions";

type Ticket = Awaited<ReturnType<typeof createUploadTicket>>;

export function TicketDemo() {
  const [file, setFile] = useState<File | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onTicket() {
    if (!file) {
      setStatus("Choose a file first (≤ 1 MB image).");
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const t = await createUploadTicket({ filename: file.name, contentType: file.type });
      setTicket(t);
      setStatus(t.ok ? `Ticket ready: doc ${t.docId}. Now PUT the bytes.` : t.error);
    } finally {
      setBusy(false);
    }
  }

  async function onUpload() {
    if (!ticket?.ok || !file) return;
    if (file.size > 1024 * 1024) {
      setStatus("Practice guardrail: keep files ≤ 1 MB.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(ticket.url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      setStatus(
        res.ok
          ? `Uploaded ${ticket.objectName} (doc ${ticket.docId} pre-registered as ticketed).`
          : `PUT failed: ${res.status} — re-ticket (URLs are single-use in spirit, 10-min expiry).`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <label className="grid gap-1 text-xs">
        File (≤ 1 MB image — name + type flow into the ticket)
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setTicket(null);
          }}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onTicket}
          disabled={busy}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? "Working…" : "Get upload ticket"}
        </button>
        <button
          onClick={onUpload}
          disabled={busy || !ticket?.ok}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
        >
          Upload via PUT
        </button>
      </div>
      {ticket?.ok && (
        <div className="rounded-md bg-zinc-50 p-2 font-mono text-[11px] break-all dark:bg-zinc-800">
          <div>doc: {ticket.docId}</div>
          <div>object: {ticket.objectName}</div>
        </div>
      )}
      {status && <p className="text-xs text-zinc-600 dark:text-zinc-400">{status}</p>}
    </div>
  );
}
