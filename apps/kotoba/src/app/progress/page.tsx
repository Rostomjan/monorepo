"use client";

import { useEffect, useMemo, useState } from "react";
import dict from "../../data/dict-compact.json";
import { db } from "../../lib/db";
import {
  PROGRESS_LEVELS,
  buildProgressIndex,
  toNewEntry,
  type LevelWord,
  type ProgressBucket,
  type ProgressLevel,
} from "../../lib/jlpt-progress";
import type { DictRecord, Entry } from "../../lib/types";

const ROW_CAP = 200;

const bucketStyle: Record<ProgressBucket, string> = {
  known: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200",
  learning: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  "to-learn": "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

export default function ProgressPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [open, setOpen] = useState<ProgressLevel | null>("N4");
  const [q, setQ] = useState("");
  const [bucket, setBucket] = useState<"all" | ProgressBucket>("all");
  const [msg, setMsg] = useState("");

  async function load() {
    setEntries(await db.entries.toArray());
  }
  useEffect(() => {
    load();
  }, []);

  const index = useMemo(() => buildProgressIndex(dict as DictRecord[], entries), [entries]);

  async function addWords(words: LevelWord[], level: ProgressLevel) {
    const existing = new Set((await db.entries.toArray()).map((e) => e.key));
    const now = Date.now();
    let added = 0;
    let skipped = 0;
    for (const w of words) {
      const e = toNewEntry(w, level, now);
      if (existing.has(e.key)) {
        skipped++;
        continue;
      }
      existing.add(e.key);
      await db.entries.add(e);
      added++;
      if (added >= 2000) break;
    }
    setMsg(`Added ${added} to library${skipped ? `, skipped ${skipped} duplicates` : ""}.`);
    load();
  }

  return (
    <main className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">JLPT progress</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          N4–N1 dictionary words vs your library. Tap a level to browse, add what to study.
        </p>
      </div>
      {msg && <p className="text-sm text-green-600 dark:text-green-400">{msg}</p>}
      {PROGRESS_LEVELS.map((level) => {
        const lp = index[level];
        const pct = lp.total ? Math.round((lp.known / lp.total) * 100) : 0;
        const rows = lp.words.filter(
          (w) =>
            (bucket === "all" || w.bucket === bucket) &&
            (!q || w.surface.includes(q) || w.reading.includes(q) || w.meaning.includes(q)),
        );
        const isOpen = open === level;
        return (
          <section key={level} className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <button onClick={() => setOpen(isOpen ? null : level)} className="flex w-full items-center gap-3 p-4 text-left">
              <span className="text-xl font-bold">{level}</span>
              <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div className="bg-green-500" style={{ width: `${lp.total ? (lp.known / lp.total) * 100 : 0}%` }} />
                <div className="bg-amber-400" style={{ width: `${lp.total ? (lp.learning / lp.total) * 100 : 0}%` }} />
              </div>
              <span className="text-sm text-zinc-600 dark:text-zinc-300">
                {lp.known}/{lp.total} · {pct}%
              </span>
            </button>
            {isOpen && (
              <div className="flex flex-col gap-3 border-t border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">
                    ✅ {lp.known} known · 🟡 {lp.learning} learning · ⚪ {lp.toLearn} to-learn
                  </span>
                  <button
                    onClick={() => addWords(lp.words.filter((w) => w.bucket === "to-learn"), level)}
                    disabled={lp.toLearn === 0}
                    className="ml-auto rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700 disabled:opacity-40 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    Add all to-learn ({lp.toLearn})
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="search…"
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  {(["all", "known", "learning", "to-learn"] as const).map((b) => (
                    <button
                      key={b}
                      onClick={() => setBucket(b)}
                      className={`rounded-lg border px-3 py-1.5 ${
                        bucket === b
                          ? "border-zinc-500 bg-zinc-200 text-zinc-900 dark:border-zinc-500 dark:bg-zinc-700 dark:text-zinc-100"
                          : "border-zinc-200 bg-white hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-1.5">
                  {rows.slice(0, ROW_CAP).map((w) => (
                    <div key={`${w.surface}｜${w.reading}`} className="flex items-center gap-3 rounded-lg border border-zinc-100 px-3 py-1.5 text-sm dark:border-zinc-800">
                      <div className="flex-1">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{w.surface}</span>{" "}
                        <span className="text-zinc-500 dark:text-zinc-400">{w.reading}</span>
                        <div className="text-zinc-600 dark:text-zinc-400">{w.meaning}</div>
                      </div>
                      <span className={`rounded px-1.5 py-0.5 text-xs ${bucketStyle[w.bucket]}`}>{w.bucket}</span>
                      {w.bucket === "to-learn" && (
                        <button
                          onClick={() => addWords([w], level)}
                          className="rounded border border-zinc-200 px-2 py-0.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        >
                          add
                        </button>
                      )}
                    </div>
                  ))}
                  {rows.length > ROW_CAP && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Showing {ROW_CAP} of {rows.length} — refine search or filter.
                    </p>
                  )}
                  {rows.length === 0 && <p className="text-sm text-zinc-500 dark:text-zinc-400">No words match.</p>}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}
