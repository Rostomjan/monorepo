import Link from "next/link";
import type { Feature } from "../features";

export function FeatureCard({ f }: { f: Feature }) {
  return (
    <Link
      href={f.href}
      className="group flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-center gap-2">
        <span className={`inline-flex h-2 w-2 rounded-full ${f.accent}`} />
        <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">{f.tag}</span>
        <span className="ml-auto text-xs text-zinc-400 group-hover:text-zinc-600">→</span>
      </div>
      <div className="text-base font-semibold leading-tight">{f.title}</div>
      <div className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{f.desc}</div>
      <div className="mt-auto rounded-lg bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
        Q: {f.question}
      </div>
    </Link>
  );
}
