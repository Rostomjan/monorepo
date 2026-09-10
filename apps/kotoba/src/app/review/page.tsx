"use client";

import { useEffect, useState } from "react";
import { db, getDueEntries } from "../../lib/db";
import { nextReview } from "../../lib/srs";
import { templateExamples } from "../../lib/examples";
import type { Entry, Grade } from "../../lib/types";

export default function ReviewPage() {
  const [queue, setQueue] = useState<Entry[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [dir, setDir] = useState<"jp-en" | "en-jp">("jp-en");
  const [favOnly, setFavOnly] = useState(false);

  async function load(f = favOnly) {
    setQueue(await getDueEntries(50, f));
    setIdx(0);
    setFlipped(false);
  }
  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cur = queue[idx];
  async function grade(g: Grade) {
    if (!cur?.id) return;
    const nx = nextReview(cur, g);
    await db.entries.update(cur.id, nx);
    setIdx((i) => i + 1);
    setFlipped(false);
  }
  async function toggleFav() {
    if (!cur?.id) return;
    await db.entries.update(cur.id, { isFavorite: !cur.isFavorite, favoritedAt: Date.now() });
    setQueue((q) => q.map((e, i) => (i === idx ? { ...e, isFavorite: !e.isFavorite } : e)));
  }

  if (!cur)
    return (
      <main className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Review</h1>
        <p className="text-zinc-500">Queue empty. Paste more Japanese or check back tomorrow.</p>
        <button
          onClick={() => {
            const f = !favOnly;
            setFavOnly(f);
            load(f);
          }}
          className="w-fit rounded-lg border px-4 py-2"
        >
          {favOnly ? "Show due" : "Review ★ only"}
        </button>
      </main>
    );

  const ex = templateExamples(cur)[0];
  const front = dir === "jp-en" ? cur.surface : cur.meaning || "(no meaning yet)";
  const back = dir === "jp-en" ? `${cur.reading} — ${cur.meaning || "(no-hit, edit in library)"}` : cur.surface;

  return (
    <main className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Review {idx + 1}/{queue.length}
        </h1>
        <div className="flex gap-2 text-sm">
          <button onClick={() => setDir(dir === "jp-en" ? "en-jp" : "jp-en")} className="rounded border px-2 py-1">
            {dir}
          </button>
          <button onClick={toggleFav} className="rounded border px-2 py-1">
            {cur.isFavorite ? "★" : "☆"}
          </button>
        </div>
      </div>
      <button
        onClick={() => setFlipped(!flipped)}
        className="min-h-56 rounded-2xl border p-8 text-center text-4xl font-bold dark:border-zinc-700"
      >
        {flipped ? back : front}
        {!flipped && <div className="mt-4 text-sm font-normal text-zinc-500">tap to flip (reading: {cur.reading})</div>}
        {flipped && cur.pitch && <div className="mt-4 text-sm font-normal text-zinc-500">pitch: {cur.pitch}</div>}
      </button>
      {flipped && (
        <div className="rounded-xl bg-zinc-100 p-3 text-sm dark:bg-zinc-900">
          例 {ex.jp} — {ex.en} <span className="text-zinc-500">(offline template)</span>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => grade("again")} className="flex-1 rounded-lg bg-red-500 px-4 py-3 text-white">
          Again
        </button>
        <button onClick={() => grade("hard")} className="flex-1 rounded-lg bg-amber-500 px-4 py-3 text-white">
          Hard
        </button>
        <button onClick={() => grade("known")} className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-white">
          Known
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        {cur.jlpt} · {cur.mastery} · {cur.kind} · keyboard: space flip, 1/2/3 grade (F favorite)
      </p>
    </main>
  );
}
