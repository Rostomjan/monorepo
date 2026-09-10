"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { db, getDueEntries } from "../../lib/db";
import { nextReview } from "../../lib/srs";
import { getExamples, upgradeExamples, type RankedExample } from "../../lib/fetch-examples";
import type { Entry, Grade } from "../../lib/types";

interface LastGrade {
  entryId: number;
  prev: { intervalDays: number; dueAt: number; mastery: Entry["mastery"] };
  grade: Grade;
}

export default function ReviewPage() {
  const [queue, setQueue] = useState<Entry[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [dir, setDir] = useState<"jp-en" | "en-jp">("jp-en");
  const [favOnly, setFavOnly] = useState(false);
  const [knownSet, setKnownSet] = useState<Set<string>>(new Set());
  const [last, setLast] = useState<LastGrade | null>(null);
  const [session, setSession] = useState({ again: 0, hard: 0, known: 0 });
  const [examples, setExamples] = useState<RankedExample[]>([]);
  const [exSource, setExSource] = useState<"template" | "llm">("template");

  async function load(f = favOnly) {
    const [due, all] = await Promise.all([getDueEntries(50, f), db.entries.toArray()]);
    setQueue(due);
    setKnownSet(new Set(all.filter((e) => e.mastery === "known").map((e) => e.surface)));
    setIdx(0);
    setFlipped(false);
    setLast(null);
  }
  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cur = queue[idx];

  // Offline-first examples: instant templates/cache, LLM upgrade in background.
  useEffect(() => {
    if (!cur) return;
    let live = true;
    (async () => {
      const { examples: base, upgraded } = await getExamples(cur, knownSet);
      if (!live) return;
      setExamples(base);
      setExSource(upgraded ? "llm" : "template");
      if (!upgraded) {
        const fresh = await upgradeExamples(cur, knownSet);
        if (live && fresh) {
          setExamples((prev) =>
            [...fresh, ...prev].sort((a, b) => a.unknownCount - b.unknownCount || a.jp.length - b.jp.length).slice(0, 4),
          );
          setExSource("llm");
        }
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur?.id, idx]);
  const grade = useCallback(
    async (g: Grade) => {
      const entry = queue[idx];
      if (!entry?.id) return;
      const nx = nextReview(entry, g);
      await db.entries.update(entry.id, nx);
      setLast({
        entryId: entry.id,
        prev: { intervalDays: entry.intervalDays, dueAt: entry.dueAt, mastery: entry.mastery },
        grade: g,
      });
      setSession((s) => ({ ...s, [g]: s[g] + 1 }));
      setIdx((i) => i + 1);
      setFlipped(false);
    },
    [queue, idx],
  );
  const flip = useCallback(() => setFlipped((f) => !f), []);
  async function toggleFav() {
    if (!cur?.id) return;
    await db.entries.update(cur.id, { isFavorite: !cur.isFavorite, favoritedAt: Date.now() });
    setQueue((q) => q.map((e, i) => (i === idx ? { ...e, isFavorite: !e.isFavorite } : e)));
  }
  async function undo() {
    if (!last) return;
    await db.entries.update(last.entryId, last.prev);
    setSession((s) => ({ ...s, [last.grade]: Math.max(0, s[last.grade] - 1) }));
    setIdx((i) => Math.max(0, i - 1));
    setLast(null);
    setFlipped(false);
  }

  const gradeRef = useRef(grade);
  gradeRef.current = grade;
  const flipRef = useRef(flip);
  flipRef.current = flip;
  const favRef = useRef(toggleFav);
  favRef.current = toggleFav;
  const flippedRef = useRef(flipped);
  flippedRef.current = flipped;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.code === "Space") {
        e.preventDefault();
        flipRef.current();
      } else if (e.key === "1") {
        if (flippedRef.current) gradeRef.current("again");
      } else if (e.key === "2") {
        if (flippedRef.current) gradeRef.current("hard");
      } else if (e.key === "3") {
        if (flippedRef.current) gradeRef.current("known");
      } else if (e.key === "f" || e.key === "F") {
        favRef.current();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const done = session.again + session.hard + session.known;
  if (!cur)
    return (
      <main className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Review</h1>
        {done > 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-lg font-bold">Session done 🎉</div>
            <div className="text-zinc-600 dark:text-zinc-300">
              {done} graded · ✅ {session.known} known · 🟡 {session.hard} hard · 🔴 {session.again} again
            </div>
          </div>
        ) : (
          <p className="text-zinc-500 dark:text-zinc-400">Queue empty. Paste more Japanese or check back tomorrow.</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => {
              const f = !favOnly;
              setFavOnly(f);
              load(f);
            }}
            className="w-fit rounded-lg border border-zinc-200 bg-white px-4 py-2 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            {favOnly ? "Show due" : "Review ★ only"}
          </button>
          {last && (
            <button
              onClick={undo}
              className="w-fit rounded-lg border border-zinc-200 bg-white px-4 py-2 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              Undo last grade
            </button>
          )}
        </div>
      </main>
    );

  const ex = examples[0];
  const front = dir === "jp-en" ? cur.surface : cur.meaning || "(no meaning yet)";
  const back = dir === "jp-en" ? `${cur.reading} — ${cur.meaning || "(no-hit, edit in library)"}` : cur.surface;

  return (
    <main className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Review {idx + 1}/{queue.length}
        </h1>
        <div className="flex gap-2 text-sm">
          <button onClick={() => setDir(dir === "jp-en" ? "en-jp" : "jp-en")} className="rounded border border-zinc-200 bg-white px-2 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800">
            {dir}
          </button>
          <button onClick={toggleFav} className="rounded border border-zinc-200 bg-white px-2 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800">
            {cur.isFavorite ? "★" : "☆"}
          </button>
          {last && (
            <button onClick={undo} className="rounded border border-zinc-200 bg-white px-2 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800">
              undo
            </button>
          )}
        </div>
      </div>
      <button
        onClick={() => setFlipped(!flipped)}
        className="min-h-56 rounded-2xl border border-zinc-200 bg-white p-8 text-center text-4xl font-bold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800/70"
      >
        {flipped ? back : front}
        {!flipped && <div className="mt-4 text-sm font-normal text-zinc-500 dark:text-zinc-400">tap to flip (reading: {cur.reading})</div>}
        {flipped && cur.pitch && <div className="mt-4 text-sm font-normal text-zinc-500 dark:text-zinc-400">pitch: {cur.pitch}</div>}
      </button>
      {flipped && ex && (
        <div className="rounded-xl bg-zinc-100 p-3 text-sm text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          例 {ex.jp} — {ex.en} <span className="text-zinc-500 dark:text-zinc-400">({exSource === "llm" ? "cached LLM" : "offline template"})</span>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => grade("again")} className="flex-1 rounded-lg bg-red-500 px-4 py-3 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500">
          Again <span className="opacity-70">(1)</span>
        </button>
        <button onClick={() => grade("hard")} className="flex-1 rounded-lg bg-amber-500 px-4 py-3 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500">
          Hard <span className="opacity-70">(2)</span>
        </button>
        <button onClick={() => grade("known")} className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-white hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500">
          Known <span className="opacity-70">(3)</span>
        </button>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {cur.jlpt} · {cur.mastery} · {cur.kind} · keyboard: space flip, 1/2/3 grade (F favorite)
        {done > 0 && ` · session: ${done} graded`}
      </p>
    </main>
  );
}
