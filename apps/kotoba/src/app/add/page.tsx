"use client";

import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { db } from "../../lib/db";
import { enrichSurface } from "../../lib/enrich";
import { parsePastedText } from "../../lib/parse-paste";
import { detectKind, entryKey, normalizeSurface } from "../../lib/normalize";

interface Row {
  surface: string;
  reading: string;
  meaning: string;
  jlpt: string;
  status: "ok" | "dup" | "no-hit" | "needs-review";
  pitch?: string;
  freq?: number;
}

export default function AddPage() {
  const [text, setText] = useState("たべる\n猫\n日本語を勉強します");
  const [rows, setRows] = useState<Row[]>([]);
  const [saved, setSaved] = useState("");
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const recogRef = useRef<{ stop: () => void } | null>(null);

  const preview = useMemo(() => rows, [rows]);

  function toggleMic() {
    if (listening) {
      recogRef.current?.stop();
      return;
    }
    const w = window as unknown as Record<string, unknown>;
    const SR = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
      | (new () => {
          lang: string;
          interimResults: boolean;
          maxAlternatives: number;
          onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string; isFinal?: boolean }>> }) => void) | null;
          onerror: ((ev: { error?: string }) => void) | null;
          onend: (() => void) | null;
          start: () => void;
          stop: () => void;
        })
      | undefined;
    if (!SR) {
      setSpeechError("Speech input not supported in this browser.");
      return;
    }
    if (typeof navigator !== "undefined" && "onLine" in navigator && !navigator.onLine) {
      setSpeechError("Mic needs network (Web Speech). You are offline.");
      return;
    }
    setSpeechError("");
    const recog = new SR();
    recog.lang = "ja-JP";
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    recog.onresult = (ev) => {
      const finals: string[] = [];
      for (const group of Array.from(ev.results as unknown as ArrayLike<ArrayLike<{ transcript: string; isFinal?: boolean }>>)) {
        for (const alt of Array.from(group)) {
          if (alt.transcript?.trim()) finals.push(alt.transcript.trim());
        }
      }
      const said = finals.join("\n").trim();
      if (said) setText((prev) => (prev.trim() ? `${prev.trim()}\n${said}` : said));
    };
    recog.onerror = (ev) => {
      setSpeechError(ev.error === "not-allowed" ? "Mic blocked — allow microphone in browser." : `Mic error: ${ev.error ?? "unknown"}`);
      setListening(false);
    };
    recog.onend = () => {
      setListening(false);
      recogRef.current = null;
    };
    recogRef.current = recog;
    try {
      recog.start();
      setListening(true);
    } catch {
      setSpeechError("Could not start mic.");
    }
  }

  async function handleParse() {
    let lines = parsePastedText(text);
    // if user pasted CSV with header, let Papa handle commas robustly
    if (text.includes(",") && lines.length > 0) {
      const p = Papa.parse<string[]>(text, { skipEmptyLines: true });
      if (p.data?.length && p.data[0].length >= 2) {
        lines = (p.data as string[][]).map((c) => ({
          surface: normalizeSurface(c[0] ?? ""),
          reading: c[1]?.trim() ? normalizeSurface(c[1]) : undefined,
          meaning: c[2]?.trim() ? normalizeSurface(c.slice(2).join(", ")) : undefined,
        }));
      }
    }
    const existing = new Set((await db.entries.toArray()).map((e) => e.key));
    const seen = new Set<string>();
    const out: Row[] = [];
    for (const l of lines.filter((l) => l.surface)) {
      const en = enrichSurface(l.surface);
      const reading = l.reading ?? en.reading;
      const meaning = l.meaning ?? en.meaning;
      const key = entryKey(l.surface, reading);
      const dup = existing.has(key) || seen.has(key);
      seen.add(key);
      out.push({
        surface: l.surface,
        reading,
        meaning,
        jlpt: en.jlpt,
        pitch: en.pitch,
        freq: en.frequencyRank,
        status: dup ? "dup" : en.noHit ? "no-hit" : en.needsReview ? "needs-review" : "ok",
      });
      if (out.length >= 500) break;
    }
    setRows(out);
    setSaved("");
  }

  async function handleSave() {
    const { isConstraintError, splitDuplicates } = await import("../../lib/dedupe");
    const now = Date.now();
    // Re-check at save time: readings may have been edited after Parse.
    const fresh = new Set((await db.entries.toArray()).map((e) => e.key));
    const candidates = rows
      .filter((r) => r.status !== "dup" && r.surface)
      .map((r) => ({ ...r, key: entryKey(r.surface, r.reading) }));
    const { unique, dupCount } = splitDuplicates(candidates, fresh);
    let n = 0;
    for (const r of unique) {
      try {
        await db.entries.add({
          key: r.key,
          surface: r.surface,
          reading: r.reading || r.surface,
          meaning: r.meaning,
          kind: detectKind(r.surface),
          jlpt: (r.jlpt as Row["jlpt"]) as "N5",
          frequencyRank: r.freq,
          pitch: r.pitch,
          mastery: "unknown",
          isFavorite: false,
          needsReview: r.status !== "ok",
          source: "paste",
          createdAt: now,
          dueAt: now,
          intervalDays: 1,
        });
        n++;
      } catch (err) {
        if (!isConstraintError(err)) throw err;
      }
    }
    const skipped = dupCount + (unique.length - n);
    setSaved(`Saved ${n} entries.${skipped ? ` Skipped ${skipped} duplicates.` : ""} No-hit saved as unknown for later fix.`);
    setRows([]);
    setText("");
  }

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Add — paste or speak Japanese</h1>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className="w-full rounded-xl border border-zinc-200 bg-white p-3 font-mono text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        placeholder={"たべる\n猫\n日本語を勉強します"}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={toggleMic} title="dictate Japanese (Web Speech ja-JP, needs network)" className="rounded-lg border border-zinc-200 bg-white px-4 py-2 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800">
          {listening ? "⏹ Stop" : "🎤 Speak"}
        </button>
        <button onClick={handleParse} className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
          Parse → Preview
        </button>
        {preview.length > 0 && (
          <button onClick={handleSave} className="rounded-lg border border-zinc-200 bg-white px-4 py-2 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800">
            Save {preview.filter((r) => r.status !== "dup").length}
          </button>
        )}
      </div>
      {listening && <p className="text-sm text-red-600 dark:text-red-400">Listening… speak Japanese, then Parse → Preview.</p>}
      {speechError && <p className="text-sm text-amber-600 dark:text-amber-400">{speechError}</p>}
      {saved && <p className="text-sm text-green-600 dark:text-green-400">{saved}</p>}
      {preview.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500 dark:text-zinc-400">
              <th>JP</th>
              <th>Reading</th>
              <th>Meaning (auto)</th>
              <th>JLPT</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((r, i) => (
              <tr key={i} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="py-1 font-bold text-zinc-900 dark:text-zinc-100">{r.surface}</td>
                <td>
                  <input
                    value={r.reading}
                    onChange={(e) =>
                      setRows((rs) => rs.map((x, j) => (j === i ? { ...x, reading: e.target.value } : x)))
                    }
                    className="w-28 rounded border border-zinc-200 bg-white px-1 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </td>
                <td>
                  <input
                    value={r.meaning}
                    onChange={(e) =>
                      setRows((rs) => rs.map((x, j) => (j === i ? { ...x, meaning: e.target.value } : x)))
                    }
                    className="w-full rounded border border-zinc-200 bg-white px-1 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </td>
                <td className="text-zinc-600 dark:text-zinc-300">{r.jlpt}</td>
                <td className="text-zinc-600 dark:text-zinc-300">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
