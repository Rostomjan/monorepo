export function CodeBlock({ code, lang = "tsx" }: { code: string; lang?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-zinc-950 text-zinc-100 dark:border-zinc-800">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">{lang}</span>
        <span className="text-[11px] text-zinc-500">copy-ready</span>
      </div>
      <pre className="overflow-x-auto p-4 text-[12px] leading-relaxed">
        <code>{code.trim()}</code>
      </pre>
    </div>
  );
}

export function Callout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
      <div className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">{title}</div>
      <div className="mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{children}</div>
    </div>
  );
}

export function DemoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 text-sm font-semibold">{title}</div>
      <div>{children}</div>
    </div>
  );
}
