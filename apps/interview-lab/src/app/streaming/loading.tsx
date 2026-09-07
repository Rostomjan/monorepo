export default function Loading() {
  return (
    <div className="rounded-xl border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-3 h-3 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      <div className="mt-3 text-xs text-zinc-500">loading.tsx — instant shell, streaming the rest…</div>
    </div>
  );
}
