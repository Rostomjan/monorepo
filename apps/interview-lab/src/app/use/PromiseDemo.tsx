"use client";

import { Suspense, use, useState, useMemo } from "react";

type User = { id: string; name: string; role: string; email: string };

// Simulated async fetch — 900ms, keyed cache so re-renders don't re-fetch
const userCache = new Map<string, Promise<User>>();
function fetchUser(id: string): Promise<User> {
  if (!userCache.has(id)) {
    userCache.set(
      id,
      new Promise<User>((resolve, reject) => {
        setTimeout(() => {
          if (id === "404") reject(new Error("User 404 — not found"));
          else
            resolve({
              id,
              name: id === "1" ? "Ada Lovelace" : id === "2" ? "Alan Turing" : `User ${id}`,
              role: id === "1" ? "admin" : "member",
              email: `user${id}@example.com`,
            });
        }, 900);
      })
    );
  }
  return userCache.get(id)!;
}

function UserCard({ promise }: { promise: Promise<User> }) {
  // Advanced: `use` unwraps promise & suspends; can be called conditionally (unlike useState/useEffect)
  const user = use(promise);
  return (
    <div className="rounded-lg border bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="text-sm font-semibold">{user.name}</div>
      <div className="text-xs text-zinc-500">{user.email} · {user.role}</div>
      <div className="mt-1 text-xs text-zinc-500">id={user.id} — rendered via <code>use(promise)</code></div>
    </div>
  );
}

function UserCardConditional({ promise, showRole }: { promise: Promise<User>; showRole: boolean }) {
  const user = use(promise);
  // `use` can be called conditionally — impossible with hooks
  const roleDetail = showRole ? ` — role detail: ${user.role.toUpperCase()}` : null;
  return (
    <div className="rounded-md border px-3 py-2 text-sm dark:border-zinc-700">
      {user.name}
      {roleDetail}
    </div>
  );
}

function ErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
      {error.message} <button onClick={onRetry} className="ml-2 underline">retry</button>
    </div>
  );
}

// Minimal ErrorBoundary for promise rejections (required — Suspense alone doesn't catch errors)
import React from "react";
class ErrorBoundary extends React.Component<{ fallback: (e: Error, retry: () => void) => React.ReactNode; children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  reset = () => this.setState({ error: null });
  render() {
    if (this.state.error) return this.props.fallback(this.state.error, this.reset);
    return this.props.children;
  }
}

export function PromiseDemo() {
  const [userId, setUserId] = useState("1");
  const [showRole, setShowRole] = useState(false);
  const promise = useMemo(() => fetchUser(userId), [userId]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {["1", "2", "3", "404"].map((id) => (
          <button
            key={id}
            onClick={() => setUserId(id)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${userId === id ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "border dark:border-zinc-700"}`}
          >
            id={id}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1.5 text-xs">
          <input type="checkbox" checked={showRole} onChange={(e) => setShowRole(e.target.checked)} />
          showRole (conditional use)
        </label>
      </div>

      <ErrorBoundary fallback={(e, retry) => <ErrorFallback error={e} onRetry={() => { userCache.delete(userId); retry(); setUserId("1"); }} />}>
        <Suspense fallback={<div className="animate-pulse rounded-lg border bg-zinc-50 p-3 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800">Loading user — suspended via use(promise)…</div>}>
          <UserCard promise={promise} />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={(e, retry) => <ErrorFallback error={e} onRetry={retry} />}>
        <Suspense fallback={<div className="text-xs text-zinc-500">Loading conditional card…</div>}>
          <UserCardConditional promise={promise} showRole={showRole} />
        </Suspense>
      </ErrorBoundary>

      <p className="text-[11px] leading-relaxed text-zinc-500">
        <code>use(promise)</code> suspends this boundary until resolved — parent stays interactive. Try <code>id=404</code> to see ErrorBoundary. Toggle <code>showRole</code> to see conditional <code>use</code> (allowed, unlike hooks).
      </p>
    </div>
  );
}
