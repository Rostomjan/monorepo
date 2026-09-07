export async function Slow({ delayMs = 2000, label = "Slow data" }: { delayMs?: number; label?: string }) {
  await new Promise((r) => setTimeout(r, delayMs));
  return (
    <div className="rounded-md border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-sm font-semibold">{label}</div>
      <div className="text-xs text-zinc-500">Loaded after {delayMs}ms · streaming via Suspense</div>
      <div className="mt-2 text-sm">This chunk streamed in after the shell. Page was interactive before it arrived.</div>
    </div>
  );
}
