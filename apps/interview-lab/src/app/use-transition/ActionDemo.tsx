"use client";

import { useState, useTransition, useOptimistic } from "react";

type Item = { id: string; title: string; liked: boolean; likes: number };

const initial: Item[] = [
  { id: "1", title: "Next.js 16 — cacheComponents", liked: false, likes: 12 },
  { id: "2", title: "React 19 — Activity", liked: true, likes: 31 },
  { id: "3", title: "Server Actions — progressive enhancement", liked: false, likes: 8 },
];

// Fake server — 800ms, occasionally fails to show error handling
async function toggleLikeOnServer(id: string, liked: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  await new Promise((r) => setTimeout(r, 800));
  if (Math.random() < 0.15) return { ok: false, error: "Network hiccup — try again" };
  return { ok: true };
}

export function ActionDemo() {
  const [items, setItems] = useState<Item[]>(initial);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // useOptimistic for instant UI— useTransition controls pending + concurrent rendering
  // Idempotent: only adjust likes if liked flag actually flips, prevents double +1 after setItems commits inside same transition
  const [optimisticItems, addOptimistic] = useOptimistic(items, (state: Item[], { id, liked }: { id: string; liked: boolean }) =>
    state.map((it) => {
      if (it.id !== id) return it;
      if (it.liked === liked) return it;
      return { ...it, liked, likes: it.likes + (liked ? 1 : -1) };
    })
  );

  function onToggle(item: Item) {
    const nextLiked = !item.liked;
    setError(null);
    setPendingId(item.id);
    // 1) Optimistic update is urgent? No — we want it inside transition so it doesn't block typing elsewhere,
    // but appears instantly. React 19 recommends optimistic updates inside transition.
    startTransition(async () => {
      addOptimistic({ id: item.id, liked: nextLiked });
      const res = await toggleLikeOnServer(item.id, nextLiked);
      if (res.ok) {
        // 2) Commit to real state — also inside transition so list re-render is concurrent; idempotent guard prevents double if optimistic still pending
        setItems((prev) =>
          prev.map((it) => {
            if (it.id !== item.id) return it;
            if (it.liked === nextLiked) return it;
            return { ...it, liked: nextLiked, likes: it.likes + (nextLiked ? 1 : -1) };
          })
        );
      } else {
        // 3) Rollback handled automatically: optimistic reverts when transition ends without setItems
        //    But we also show error; the optimistic value will revert on next render because `items` didn't change.
        setError(res.error);
        // Force revert by bumping? In useOptimistic, after transition, it reverts to `items` which is still old.
      }
      setPendingId(null);
    });
  }

  // Chained transitions example: bulk action
  const [bulkPending, setBulkPending] = useState(false);
  function onBulkLikeAll() {
    setError(null);
    // Snapshot from base `items` — using optimisticItems as source would be stale and cause missed/double updates
    const toLike = items.filter((it) => !it.liked);
    if (toLike.length === 0) return;
    startTransition(async () => {
      setBulkPending(true);
      const succeeded: string[] = [];
      for (const it of toLike) {
        addOptimistic({ id: it.id, liked: true });
        const res = await toggleLikeOnServer(it.id, true);
        if (res.ok) {
          succeeded.push(it.id);
        } else {
          setError(res.error);
          // failed item stays optimistic until transition ends, then auto-reverts (no setItems)
        }
      }
      if (succeeded.length > 0) {
        setItems((prev) =>
          prev.map((p) => (succeeded.includes(p.id) && !p.liked ? { ...p, liked: true, likes: p.likes + 1 } : p))
        );
      }
      setBulkPending(false);
    });
  }

  return (
    <div className="rounded-lg border p-3 dark:border-zinc-800">
      <div className="flex items-center gap-2">
        <div className="text-xs font-bold uppercase tracking-widest text-violet-600">Advanced: useTransition + useOptimistic</div>
        <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${isPending || bulkPending ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isPending || bulkPending ? "bg-amber-500 animate-pulse" : "bg-zinc-400"}`} />
          {isPending || bulkPending ? "transition pending — UI stays responsive" : "idle"}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {optimisticItems.map((it) => {
          const pending = pendingId === it.id;
          return (
            <div key={it.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 dark:border-zinc-800 ${pending ? "opacity-60" : ""}`}>
              <div>
                <div className="text-sm font-medium">{it.title}</div>
                <div className="text-xs text-zinc-500">{it.likes} likes · {it.liked ? "liked" : "not liked"}</div>
              </div>
              <button
                onClick={() => onToggle(it)}
                disabled={!!pendingId || bulkPending}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${it.liked ? "bg-pink-600 text-white" : "border dark:border-zinc-700"} disabled:opacity-50`}
              >
                {pending ? "…" : it.liked ? "♥ Liked" : "♡ Like"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={onBulkLikeAll} disabled={!!pendingId || bulkPending} className="rounded-md border px-3 py-1.5 text-xs dark:border-zinc-700 disabled:opacity-50">
          {bulkPending ? "Liking all…" : "Like all (chained transitions)"}
        </button>
        <input placeholder="Type here while server is pending — never blocks" className="flex-1 rounded-md border px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800" />
      </div>

      {error && <div className="mt-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">{error} — optimistic reverted.</div>}

      <ul className="mt-3 list-disc space-y-1 pl-5 text-[11px] leading-relaxed text-zinc-500">
        <li>
          <code>isPending</code> is true across the <em>entire</em> <code>startTransition(fn)</code> — including the <code>await toggleLikeOnServer</code>. While pending, keep typing in the input to prove UI isn’t blocked.
        </li>
        <li>
          <code>useOptimistic</code> shows the next state instantly; if server fails, React reverts to <code>items</code> (the source of truth). No manual rollback.
        </li>
        <li>
          Chained <code>await</code> inside a single <code>startTransition</code> keeps <code>isPending</code> true until the <em>last</em> await — useful for bulk or multi-step wizards.
        </li>
      </ul>
    </div>
  );
}
