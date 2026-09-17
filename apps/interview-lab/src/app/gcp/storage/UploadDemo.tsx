"use client";

import { useState } from "react";
import { getStorageStatus, mintUploadUrl, probeLiveWrite } from "./actions";

type MintResult = Awaited<ReturnType<typeof mintUploadUrl>>;

export function UploadDemo({ initialMode }: { initialMode: "local" | "live" }) {
  const [filename, setFilename] = useState("avatar.png");
  const [contentType, setContentType] = useState("image/png");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<MintResult | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onMint() {
    setBusy(true);
    setStatus(null);
    setResult(null);
    try {
      // When a file is chosen, mint for the FILE (name + type) so the
      // signed content-type always matches the PUT — mismatch = 403.
      const fileType = file?.type ?? "";
      const useFile =
        file && (fileType === "image/png" || fileType === "image/jpeg" || fileType === "image/webp");
      const r = await mintUploadUrl(
        useFile
          ? { filename: file.name, contentType: fileType }
          : { filename, contentType },
      );
      setResult(r);
      if (!r.ok) {
        setStatus(r.error);
      } else if (useFile) {
        setFilename(file.name);
        setContentType(fileType);
        setStatus(`Minted for ${file.name} (${fileType}) — matched to your file.`);
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Mint failed");
    } finally {
      setBusy(false);
    }
  }

  async function onUpload() {
    if (!result || !result.ok) {
      setStatus("Mint a URL first, then upload.");
      return;
    }
    if (!file) {
      setStatus("Choose a file first (≤ 1 MB image) — then Upload via PUT.");
      return;
    }
    if (result.mode !== "live") {
      setStatus("Local shape — no PUT performed (zero cost). Set GCS_BUCKET to go live.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setStatus("Practice guardrail: keep files ≤ 1 MB to stay in free tier.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(result.url, {
        method: "PUT",
        // Same source of truth as the mint above: file wins when present.
        headers: { "Content-Type": file.type || contentType },
        body: file,
      });
      if (res.ok) {
        setStatus(`Uploaded ${result.objectName} (${file.size} bytes). Delete after practice to stay free.`);
      } else {
        const body = await res.text().catch(() => "");
        const hint = res.status === 403 ? " (type/name mismatch vs minted URL — re-mint with the file chosen)" : "";
        setStatus(`PUT failed: ${res.status}${hint} ${body.slice(0, 160)}`);
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRefreshStatus() {
    const s = await getStorageStatus();
    setStatus(s.mode === "live" ? `Live: bucket ${s.bucket}` : s.reason);
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="inline-flex rounded-full border px-3 py-1 text-xs font-semibold">
        Mode: {initialMode === "live" ? "● live (bucket set)" : "○ local (no bucket — free)"}
      </div>
      <div className="grid gap-2">
        <label className="grid gap-1 text-xs">
          Filename
          <input
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            className="rounded-md border px-2 py-1.5 font-mono dark:bg-zinc-800 dark:border-zinc-700"
          />
        </label>
        <label className="grid gap-1 text-xs">
          Content-Type (practice: images only)
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="rounded-md border px-2 py-1.5 dark:bg-zinc-800 dark:border-zinc-700"
          >
            <option value="image/png">image/png</option>
            <option value="image/jpeg">image/jpeg</option>
            <option value="image/webp">image/webp</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs">
          File to PUT (≤ 1 MB, only used when live)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              if (f && (f.type === "image/png" || f.type === "image/jpeg" || f.type === "image/webp")) {
                setContentType(f.type);
              }
            }}
          />
          {file && (
            <span className="text-zinc-500">
              {file.name} ({file.type || "unknown type"}, {Math.round(file.size / 1024)} KB)
              {contentType !== file.type && file.type
                ? " — content-type auto-matched to file"
                : ""}
            </span>
          )}
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onMint}
          disabled={busy}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {busy ? "Working…" : "Mint URL"}
        </button>
        <button
          onClick={onUpload}
          disabled={busy || !result?.ok}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
        >
          Upload via PUT
        </button>
        <button onClick={onRefreshStatus} className="rounded-md border px-3 py-1.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800">
          Refresh status
        </button>
        <button
          onClick={async () => {
            setBusy(true);
            try {
              const r = await probeLiveWrite();
              setStatus(r.ok ? r.message : r.error);
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-md border px-3 py-1.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          Test live write
        </button>
      </div>
      {result?.ok && (
        <div className="rounded-md bg-zinc-50 p-2 font-mono text-[11px] break-all dark:bg-zinc-800">
          {result.url}
          <div className="mt-1 text-zinc-500">{result.note}</div>
        </div>
      )}
      {status && <p className="text-xs text-zinc-600 dark:text-zinc-400">{status}</p>}
    </div>
  );
}
