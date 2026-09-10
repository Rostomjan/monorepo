"use client";

import { useEffect, useState } from "react";
import { db } from "../../lib/db";
import type { Entry } from "../../lib/types";

export default function LibraryPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [q, setQ] = useState("");
  const [jlpt, setJlpt] = useState("all");
  const [mastery, setMastery] = useState("all");
  const [favOnly, setFavOnly] = useState(false);

  async function load() {
    setEntries(await db.entries.orderBy("createdAt").reverse().toArray());
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = entries.filter(
    (e) =>
      (!q || e.surface.includes(q) || e.reading.includes(q) || e.meaning.includes(q)) &&
      (jlpt === "all" || e.jlpt === jlpt) &&
      (mastery === "all" || e.mastery === mastery) &&
      (!favOnly || e.isFavorite) &&
      !e.blacklisted,
  );

  async function toggleFav(e: Entry) {
    await db.entries.update(e.id!, { isFavorite: !e.isFavorite, favoritedAt: Date.now() });
    load();
  }
  async function setMasteryOf(e: Entry, m: Entry["mastery"]) {
    await db.entries.update(e.id!, { mastery: m });
    load();
  }
  async function remove(e: Entry) {
    await db.entries.delete(e.id!);
    load();
  }

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Library ({filtered.length})</h1>
      <div className="flex flex-wrap gap-2 text-sm">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search…"
          className="rounded-lg border px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select value={jlpt} onChange={(e) => setJlpt(e.target.value)} className="rounded-lg border px-2 dark:bg-zinc-900">
          {["all", "N5", "N4", "N3", "N2", "N1", "unknown"].map((j) => (
            <option key={j}>{j}</option>
          ))}
        </select>
        <select
          value={mastery}
          onChange={(e) => setMastery(e.target.value)}
          className="rounded-lg border px-2 dark:bg-zinc-900"
        >
          {["all", "unknown", "learning", "known"].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <button
          onClick={() => setFavOnly(!favOnly)}
          className={`rounded-lg border px-3 ${favOnly ? "bg-yellow-100" : ""}`}
        >
          ★ useful
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {filtered.map((e) => (
          <div key={e.id} className="flex items-center gap-3 rounded-xl border p-3 dark:border-zinc-800">
            <div className="flex-1">
              <div className="font-bold">
                {e.surface} <span className="font-normal text-zinc-500">{e.reading}</span>
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                {e.meaning} · {e.jlpt} · {e.mastery}
                {e.pitch ? ` · pitch ${e.pitch}` : ""}
                {e.frequencyRank ? ` · freq ${e.frequencyRank}` : ""}
              </div>
            </div>
            <button onClick={() => toggleFav(e)} title="favorite">
              {e.isFavorite ? "★" : "☆"}
            </button>
            <select
              value={e.mastery}
              onChange={(ev) => setMasteryOf(e, ev.target.value as Entry["mastery"])}
              className="rounded border text-sm dark:bg-zinc-900"
            >
              <option value="unknown">unknown</option>
              <option value="learning">learning</option>
              <option value="known">known</option>
            </select>
            <button onClick={() => remove(e)} className="text-sm text-red-500">
              del
            </button>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-zinc-500">Nothing here. Paste some Japanese in Add.</p>}
      </div>
    </main>
  );
}
