"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dict from "../data/dict-compact.json";
import { db } from "../lib/db";
import { exportBackup, importBackup } from "../lib/backup";
import { PROGRESS_LEVELS, buildProgressIndex } from "../lib/jlpt-progress";
import type { DictRecord, Entry } from "../lib/types";

export default function Home() {
  const [stats, setStats] = useState({ total: 0, due: 0, fav: 0, known: 0 });
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  async function refresh() {
    const all = await db.entries.toArray();
    setAllEntries(all);
    const now = Date.now();
    setStats({
      total: all.length,
      due: all.filter((e) => e.dueAt <= now && !e.suspended && !e.blacklisted).length,
      fav: all.filter((e) => e.isFavorite).length,
      known: all.filter((e) => e.mastery === "known").length,
    });
  }
  useEffect(() => {
    refresh();
  }, []);
  const progress = useMemo(() => buildProgressIndex(dict as DictRecord[], allEntries), [allEntries]);
  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">言葉 kotoba</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Paste Japanese — the app fills reading, meaning, JLPT, frequency, pitch. Study offline.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Entries", stats.total],
          ["Due", stats.due],
          ["★ Useful", stats.fav],
          ["Known", stats.known],
        ].map(([k, v]) => (
          <div key={k as string} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{v}</div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">{k}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600" href="/add">
          Paste Japanese
        </Link>
        <Link className="rounded-lg border border-zinc-200 bg-white px-4 py-2 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800" href="/review">
          Review due ({stats.due})
        </Link>
        <Link className="rounded-lg border border-zinc-200 bg-white px-4 py-2 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800" href="/library">
          Library
        </Link>
        <Link className="rounded-lg border border-zinc-200 bg-white px-4 py-2 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800" href="/progress">
          JLPT progress
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        <div className="text-sm font-bold">N4–N1 progress</div>
        {PROGRESS_LEVELS.map((level) => {
          const lp = progress[level];
          const pct = lp.total ? Math.round((lp.known / lp.total) * 100) : 0;
          return (
            <Link key={level} href="/progress" className="flex items-center gap-3 text-sm">
              <span className="w-6 font-bold">{level}</span>
              <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div className="bg-green-500" style={{ width: `${lp.total ? (lp.known / lp.total) * 100 : 0}%` }} />
                <div className="bg-amber-400" style={{ width: `${lp.total ? (lp.learning / lp.total) * 100 : 0}%` }} />
              </div>
              <span className="w-20 text-right text-zinc-600 dark:text-zinc-300">
                {lp.known}/{lp.total} · {pct}%
              </span>
            </Link>
          );
        })}
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Dictionary: JMDict eng-common + JLPT/frequency/pitch snapshot (EDRDG, CC-BY-SA). Offline-first: study works in airplane
        mode.
      </p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          onClick={() => exportBackup()}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          Export backup
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          Import backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const r = await importBackup(f);
              setMsg(`Imported ${r.added}, skipped ${r.skipped} duplicates.`);
              refresh();
            } catch (err) {
              setMsg(err instanceof Error ? err.message : "import failed");
            }
            e.target.value = "";
          }}
        />
        {msg && <span className="text-zinc-600 dark:text-zinc-300">{msg}</span>}
      </div>
    </main>
  );
}
