import Link from "next/link";
import { FeatureCard } from "./components/FeatureCard";
import { features } from "./features";

export default function Page() {
  const nextFeatures = features.filter((f) => !f.href.startsWith("/clerk") && !f.href.startsWith("/gcp"));
  const clerkFeatures = features.filter((f) => f.href.startsWith("/clerk"));
  const gcpFeatures = features.filter((f) => f.href.startsWith("/gcp"));

  return (
    <main className="space-y-8">
      <div className="rounded-2xl border bg-gradient-to-br from-white to-zinc-50 p-6 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950 sm:p-8">
        <div className="inline-flex rounded-full border bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          Interview prep · Next.js 16 · React 19 · Tailwind v4 · Clerk
        </div>
        <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Next.js Interview Lab — latest features + Clerk enterprise, each with a live demo
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-base">
          Two labs in one: Next.js 16 demos + <Link href="/clerk" className="underline font-medium">Clerk enterprise hub</Link> (SSO, SCIM, Audit, RBAC, orgs — what’s demoable on the Free tier). No
          tests per spec — just runnable examples.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-indigo-600 px-3 py-1 font-semibold text-white">App Router</span>
          <span className="rounded-full bg-zinc-900 px-3 py-1 font-semibold text-white dark:bg-zinc-800">RSC</span>
          <span className="rounded-full border bg-white px-3 py-1 font-medium dark:border-zinc-700 dark:bg-zinc-900">
            Server Actions
          </span>
          <span className="rounded-full bg-emerald-600 px-3 py-1 font-semibold text-white">Clerk Free ✓</span>
          <span className="rounded-full border bg-white px-3 py-1 font-medium dark:border-zinc-700 dark:bg-zinc-900">Activity</span>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Next.js — click any card</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {nextFeatures.map((f) => (
            <FeatureCard key={f.href} f={f} />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Clerk Enterprise — free-tier aware</h2>
          <Link href="/clerk" className="text-xs underline text-indigo-600">
            View all →
          </Link>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Green = live on Free (RBAC, orgs, multi-tenant…), amber = demo via dashboard config, red = code-only (SCIM, Audit require upgrade).
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clerkFeatures.map((f) => (
            <FeatureCard key={f.href} f={f} />
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs leading-relaxed dark:border-indigo-900 dark:bg-indigo-950/30">
          New: <b>9 dedicated pages</b> —{" "}
          <Link href="/clerk/sso" className="underline">
            SSO
          </Link>
          ,{" "}
          <Link href="/clerk/scim" className="underline">
            SCIM
          </Link>
          ,{" "}
          <Link href="/clerk/audit-logs" className="underline">
            Audit Logs
          </Link>
          ,{" "}
          <Link href="/clerk/rbac" className="underline">
            RBAC
          </Link>
          ,{" "}
          <Link href="/clerk/fine-grained" className="underline">
            Fine-grained
          </Link>
          ,{" "}
          <Link href="/clerk/organizations" className="underline">
            Organizations
          </Link>
          ,{" "}
          <Link href="/clerk/multi-tenant" className="underline">
            Multi-tenant
          </Link>
          ,{" "}
          <Link href="/clerk/admin-portals" className="underline">
            Admin portals
          </Link>
          ,{" "}
          <Link href="/clerk/user-lifecycle" className="underline">
            User lifecycle
          </Link>{" "}
          — each shows <b>Dashboard path + code + “Requires upgrade”</b> when paid.
        </div>
      </div>

      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">GCP — local-first</h2>
          <Link href="/gcp" className="text-xs underline text-sky-600">
            View all →
          </Link>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Zero creds to learn: Run, GCS presigned upload, Secrets/IAM, SQL vs Firestore. Code + gcloud ready for a
          real project.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gcpFeatures.map((f) => (
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
