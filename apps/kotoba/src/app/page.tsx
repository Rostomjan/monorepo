"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "../lib/db";

export default function Home() {
  const [stats, setStats] = useState({ total: 0, due: 0, fav: 0, known: 0 });
  useEffect(() => {
    (async () => {
      const all = await db.entries.toArray();
      const now = Date.now();
      setStats({
        total: all.length,
        due: all.filter((e) => e.dueAt <= now && !e.suspended && !e.blacklisted).length,
        fav: all.filter((e) => e.isFavorite).length,
        known: all.filter((e) => e.mastery === "known").length,
      });
    })();
  }, []);
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
          <div key={k as string} className="rounded-xl border p-4 dark:border-zinc-800">
            <div className="text-2xl font-bold">{v}</div>
            <div className="text-sm text-zinc-500">{k}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link className="rounded-lg bg-blue-600 px-4 py-2 text-white" href="/add">
          Paste Japanese
        </Link>
        <Link className="rounded-lg border px-4 py-2 dark:border-zinc-700" href="/review">
          Review due ({stats.due})
        </Link>
        <Link className="rounded-lg border px-4 py-2 dark:border-zinc-700" href="/library">
          Library
        </Link>
      </div>
      <p className="text-xs text-zinc-500">
        Dictionary: JMDict-Extended eng-common snapshot (EDRDG, CC-BY-SA). Offline-first: study works in airplane
        mode.
      </p>
    </main>
  );
}
