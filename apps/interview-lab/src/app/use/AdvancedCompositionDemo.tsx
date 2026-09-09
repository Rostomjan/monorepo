"use client";

import { Suspense, use, useMemo, useState, useTransition } from "react";
import React from "react";

type Post = { id: string; title: string };

// Server would create these promises; here we simulate with cache
const postCache = new Map<string, Promise<Post[]>>();
function fetchPosts(userId: string): Promise<Post[]> {
  if (!postCache.has(userId)) {
    postCache.set(
      userId,
      new Promise<Post[]>((resolve) =>
        setTimeout(
          () =>
            resolve(
              Array.from({ length: 3 }, (_, i) => ({ id: `${userId}-${i}`, title: `Post ${i + 1} for user ${userId} — ${["CacheComponents", "use(promise)", "Activity"][i % 3]}` }))
            ),
          700
        )
      )
    );
  }
  return postCache.get(userId)!;
}

const userCache = new Map<string, Promise<{ name: string }>>();
function fetchUserMeta(id: string) {
  if (!userCache.has(id)) {
    userCache.set(
      id,
      new Promise<{ name: string }>((r) => setTimeout(() => r({ name: id === "1" ? "Ada" : "Alan" }), 600))
    );
  }
  return userCache.get(id)!;
}

function Posts({ promise }: { promise: Promise<Post[]> }) {
  const posts = use(promise);
  return (
    <ul className="space-y-1">
      {posts.map((p) => (
        <li key={p.id} className="rounded border px-2 py-1 text-xs dark:border-zinc-700">
          {p.title}
        </li>
      ))}
    </ul>
  );
}

function UserMeta({ promise }: { promise: Promise<{ name: string }> }) {
  const { name } = use(promise);
  return <div className="text-xs text-zinc-500">Author: <b>{name}</b> (via <code>use(promise)</code>)</div>;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  render() { return this.state.error ? <div className="text-xs text-red-600">Error: {this.state.error.message}</div> : this.props.children; }
}

export function AdvancedCompositionDemo() {
  const [userId, setUserId] = useState("1");
  const [isPending, startTransition] = useTransition();

  // Keyed promises — stable unless userId changes; no waterfall, parallel fetch
  const postsPromise = useMemo(() => fetchPosts(userId), [userId]);
  const userPromise = useMemo(() => fetchUserMeta(userId), [userId]);

  function switchUser(next: string) {
    // Mark navigation as transition — keep stale UI interactive
    startTransition(() => setUserId(next));
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {["1", "2"].map((id) => (
          <button
            key={id}
            onClick={() => switchUser(id)}
            className={`rounded-full px-3 py-1 text-xs ${userId === id ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "border dark:border-zinc-700"}`}
          >
            User {id}
          </button>
        ))}
        <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${isPending ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isPending ? "bg-amber-500 animate-pulse" : "bg-zinc-400"}`} />
          {isPending ? "transition — stale UI kept" : "idle"}
        </span>
      </div>

      <div className={`grid gap-3 sm:grid-cols-2 ${isPending ? "opacity-60" : ""}`}>
        <ErrorBoundary>
          <Suspense fallback={<div className="animate-pulse rounded border bg-zinc-50 p-3 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800">Loading author…</div>}>
            <div className="rounded-lg border bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
              <div className="text-xs font-semibold">Author (independent Suspense)</div>
              <div className="mt-2"><UserMeta promise={userPromise} /></div>
            </div>
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          <Suspense fallback={<div className="animate-pulse rounded border bg-zinc-50 p-3 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800">Loading posts…</div>}>
            <div className="rounded-lg border bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
              <div className="text-xs font-semibold">Posts (independent Suspense)</div>
              <div className="mt-2"><Posts promise={postsPromise} /></div>
            </div>
          </Suspense>
        </ErrorBoundary>
      </div>

      <div className="rounded bg-zinc-950 p-2 text-[11px] leading-relaxed text-zinc-300">
        <b>Advanced composition:</b> Two promises start <em>parallel</em> (no waterfall) and each suspends its own boundary. Switching user with <code>startTransition</code> keeps previous author/posts visible as stale UI with <code>isPending</code> — combine <code>use</code> + <code>Suspense</code> + <code>useTransition</code>. In Next.js: server creates <code>userPromise = fetchUser()</code> without <code>await</code>, passes to client → client <code>use(promise)</code>.
      </div>

      <p className="text-[11px] leading-relaxed text-zinc-500">
        Interview: promises must be created <em>outside</em> render or memoized — otherwise new promise per render → infinite suspend. Cache by key (userId) as above.
      </p>
    </div>
  );
}
