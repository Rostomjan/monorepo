"use client";

import { useMemo, useState } from "react";
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

  const preview = useMemo(() => rows, [rows]);

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
    const now = Date.now();
    let n = 0;
    for (const r of rows.filter((r) => r.status !== "dup" && r.surface)) {
      await db.entries.add({
        key: entryKey(r.surface, r.reading),
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
    }
    setSaved(`Saved ${n} entries. Duplicates skipped, no-hit saved as unknown for later fix.`);
    setRows([]);
    setText("");
  }

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Add — paste Japanese only</h1>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className="w-full rounded-xl border p-3 font-mono dark:border-zinc-700 dark:bg-zinc-900"
        placeholder={"たべる\n猫\n日本語を勉強します"}
      />
      <div className="flex gap-2">
        <button onClick={handleParse} className="rounded-lg bg-blue-600 px-4 py-2 text-white">
          Parse → Preview
        </button>
        {preview.length > 0 && (
          <button onClick={handleSave} className="rounded-lg border px-4 py-2 dark:border-zinc-700">
            Save {preview.filter((r) => r.status !== "dup").length}
          </button>
        )}
      </div>
      {saved && <p className="text-sm text-green-600">{saved}</p>}
      {preview.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500">
              <th>JP</th>
              <th>Reading</th>
              <th>Meaning (auto)</th>
              <th>JLPT</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((r, i) => (
              <tr key={i} className="border-t dark:border-zinc-800">
                <td className="py-1 font-bold">{r.surface}</td>
                <td>
                  <input
                    value={r.reading}
                    onChange={(e) =>
                      setRows((rs) => rs.map((x, j) => (j === i ? { ...x, reading: e.target.value } : x)))
                    }
                    className="w-28 rounded border px-1 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </td>
                <td>
                  <input
                    value={r.meaning}
                    onChange={(e) =>
                      setRows((rs) => rs.map((x, j) => (j === i ? { ...x, meaning: e.target.value } : x)))
                    }
                    className="w-full rounded border px-1 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </td>
                <td>{r.jlpt}</td>
                <td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
