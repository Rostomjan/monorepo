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
  const [showHidden, setShowHidden] = useState(false);
  const [needsFixOnly, setNeedsFixOnly] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editReading, setEditReading] = useState("");
  const [editMeaning, setEditMeaning] = useState("");
  const [msg, setMsg] = useState("");

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
      (!needsFixOnly || e.needsReview || !e.meaning) &&
      (showHidden || (!e.suspended && !e.blacklisted)),
  );

  async function toggleFav(e: Entry) {
    await db.entries.update(e.id!, { isFavorite: !e.isFavorite, favoritedAt: Date.now() });
    load();
  }
  async function toggleSuspend(e: Entry) {
    await db.entries.update(e.id!, { suspended: !e.suspended });
    load();
  }
  async function toggleBlacklist(e: Entry) {
    await db.entries.update(e.id!, { blacklisted: !e.blacklisted });
    load();
  }
  function startEdit(e: Entry) {
    setEditingId(e.id!);
    setEditReading(e.reading);
    setEditMeaning(e.meaning);
  }
  async function saveEdit(e: Entry) {
    const reading = editReading.trim() || e.surface;
    const meaning = editMeaning.trim();
    const { entryKey } = await import("../../lib/normalize");
    const { mergeEntries } = await import("../../lib/dedupe");
    const newKey = entryKey(e.surface, reading);
    if (newKey !== e.key) {
      const clash = (await db.entries.where("key").equals(newKey).toArray()).find((o) => o.id !== e.id);
      if (clash?.id !== undefined) {
        // Merge into the surviving entry instead of creating a duplicate.
        const merged = mergeEntries({ ...clash, reading, meaning: clash.meaning || meaning }, e);
        await db.entries.put(merged);
        await db.entries.delete(e.id!);
        setMsg(`Merged into existing “${clash.surface}”.`);
        setEditingId(null);
        load();
        return;
      }
    }
    await db.entries.update(e.id!, { reading, meaning, key: newKey, needsReview: !meaning });
    setMsg("");
    setEditingId(null);
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
      {msg && <p className="text-sm text-green-600 dark:text-green-400">{msg}</p>}
      <div className="flex flex-wrap gap-2 text-sm">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search…"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <select value={jlpt} onChange={(e) => setJlpt(e.target.value)} className="rounded-lg border border-zinc-200 bg-white px-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
          {["all", "N5", "N4", "N3", "N2", "N1", "unknown"].map((j) => (
            <option key={j}>{j}</option>
          ))}
        </select>
        <select
          value={mastery}
          onChange={(e) => setMastery(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          {["all", "unknown", "learning", "known"].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <button
          onClick={() => setFavOnly(!favOnly)}
          className={`rounded-lg border px-3 ${
            favOnly
              ? "border-yellow-300 bg-yellow-100 text-yellow-900 dark:border-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200"
              : "border-zinc-200 bg-white hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          }`}
        >
          ★ useful
        </button>
        <button
          onClick={() => setNeedsFixOnly(!needsFixOnly)}
          title="entries with missing meaning / needs review"
          className={`rounded-lg border px-3 ${
            needsFixOnly
              ? "border-blue-300 bg-blue-100 text-blue-900 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-200"
              : "border-zinc-200 bg-white hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          }`}
        >
          needs fix
        </button>
        <button
          onClick={() => setShowHidden(!showHidden)}
          title="show suspended / blacklisted"
          className={`rounded-lg border px-3 ${
            showHidden
              ? "border-zinc-500 bg-zinc-200 text-zinc-900 dark:border-zinc-500 dark:bg-zinc-700 dark:text-zinc-100"
              : "border-zinc-200 bg-white hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          }`}
        >
          hidden
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {filtered.map((e) => (
          <div key={e.id} className={`flex items-center gap-3 rounded-xl border p-3 ${e.suspended || e.blacklisted ? "border-dashed border-zinc-300 bg-zinc-50 opacity-70 dark:border-zinc-700 dark:bg-zinc-900/50" : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"}`}>
            <div className="flex-1">
              <div className="font-bold text-zinc-900 dark:text-zinc-100">
                {e.surface} <span className="font-normal text-zinc-500 dark:text-zinc-400">{e.reading}</span>
                {(e.needsReview || !e.meaning) && (
                  <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-normal text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">needs fix</span>
                )}
                {e.suspended && (
                  <span className="ml-2 rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-normal text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">suspended</span>
                )}
                {e.blacklisted && (
                  <span className="ml-2 rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-normal text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">blacklisted</span>
                )}
              </div>
              {editingId === e.id ? (
                <div className="mt-2 flex flex-col gap-1">
                  <input
                    value={editReading}
                    onChange={(ev) => setEditReading(ev.target.value)}
                    placeholder="reading"
                    className="rounded border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <input
                    value={editMeaning}
                    onChange={(ev) => setEditMeaning(ev.target.value)}
                    placeholder="meaning"
                    className="rounded border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <div className="flex gap-2 text-sm">
                    <button onClick={() => saveEdit(e)} className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">save</button>
                    <button onClick={() => setEditingId(null)} className="rounded border border-zinc-200 px-3 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">cancel</button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  {e.meaning || "(no meaning — edit to fix)"} · {e.jlpt} · {e.mastery}
                  {e.pitch ? ` · pitch ${e.pitch}` : ""}
                  {e.frequencyRank ? ` · freq ${e.frequencyRank}` : ""}
                </div>
              )}
            </div>
            <button onClick={() => toggleFav(e)} title="favorite" className="text-zinc-600 hover:text-yellow-600 dark:text-zinc-300 dark:hover:text-yellow-400">
              {e.isFavorite ? "★" : "☆"}
            </button>
            <button onClick={() => startEdit(e)} title="edit reading/meaning" className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100">
              edit
            </button>
            <button onClick={() => toggleSuspend(e)} title={e.suspended ? "unsuspend" : "suspend (exclude from review)"} className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100">
              {e.suspended ? "▶" : "⏸"}
            </button>
            <button onClick={() => toggleBlacklist(e)} title={e.blacklisted ? "unblacklist" : "blacklist (exclude from review)"} className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100">
              {e.blacklisted ? "↩" : "🚫"}
            </button>
            <select
              value={e.mastery}
              onChange={(ev) => setMasteryOf(e, ev.target.value as Entry["mastery"])}
              className="rounded border border-zinc-200 bg-white text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="unknown">unknown</option>
              <option value="learning">learning</option>
              <option value="known">known</option>
            </select>
            <button onClick={() => remove(e)} className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300">
              del
            </button>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-zinc-500 dark:text-zinc-400">Nothing here. Paste some Japanese in Add.</p>}
      </div>
    </main>
  );
}
