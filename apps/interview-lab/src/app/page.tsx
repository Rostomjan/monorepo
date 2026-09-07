import { FeatureCard } from "./components/FeatureCard";
import { features } from "./features";

export default function Page() {
  return (
    <main className="space-y-8">
      <div className="rounded-2xl border bg-gradient-to-br from-white to-zinc-50 p-6 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950 sm:p-8">
        <div className="inline-flex rounded-full border bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          Interview prep · Next.js 16 · React 19 · Tailwind v4
        </div>
        <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Next.js Interview Lab — latest features, each with a live demo
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-base">
          Built for interview rehearsal: every route isolates one “exam question” and shows the live behavior, the minimal code, and what the interviewer expects you to explain. No tests per spec — just runnable examples.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-indigo-600 px-3 py-1 font-semibold text-white">App Router</span>
          <span className="rounded-full bg-zinc-900 px-3 py-1 font-semibold text-white dark:bg-zinc-800">RSC</span>
          <span className="rounded-full border bg-white px-3 py-1 font-medium dark:border-zinc-700 dark:bg-zinc-900">
            Server Actions
          </span>
          <span className="rounded-full border bg-white px-3 py-1 font-medium dark:border-zinc-700 dark:bg-zinc-900">PPR</span>
          <span className="rounded-full border bg-white px-3 py-1 font-medium dark:border-zinc-700 dark:bg-zinc-900">Activity</span>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Demos — click any card</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <FeatureCard key={f.href} f={f} />
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-sm font-semibold">How to use for interview prep</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          <li>Open any route, read the right-panel “Interviewer expects” then try to explain it without looking.</li>
          <li>Hit the source toggle — copy the minimal snippet for whiteboard practice.</li>
          <li>Topics stack: start RSC → Streaming → Caching → Actions → Routing → Perf.</li>
          <li>
            Latest deltas to mention: async <code>cookies()/headers()/searchParams</code> (Next 15), <code>cacheComponents</code>/PPR
            (Next 16), <code>&lt;Activity&gt;</code> (React 19), View Transitions.
          </li>
        </ul>
      </div>
    </main>
  );
}
