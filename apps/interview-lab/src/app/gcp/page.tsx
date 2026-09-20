import Link from "next/link";
import { Callout, CodeBlock } from "../components/CodeBlock";

export const metadata = { title: "GCP for Full-Stack" };

const concepts = [
  {
    href: "/gcp/run",
    title: "Cloud Run",
    desc: "Dockerfile, gcloud run deploy, concurrency, min-instances.",
    tier: "Deploy",
    badge: "✅ Local demo · deploy needs project",
    color: "bg-blue-600",
  },
  {
    href: "/gcp/storage",
    title: "Cloud Storage (GCS)",
    desc: "Presigned upload via Server Action, no key leak.",
    tier: "Storage",
    badge: "✅ Local flow · live needs bucket",
    color: "bg-emerald-600",
  },
  {
    href: "/gcp/secrets",
    title: "Secret Manager + IAM",
    desc: "Server-only secrets, service accounts, no NEXT_PUBLIC_ leak.",
    tier: "Security",
    badge: "✅ Local demo · live needs project",
    color: "bg-amber-600",
  },
  {
    href: "/gcp/databases",
    title: "Cloud SQL vs Firestore",
    desc: "Postgres vs NoSQL trade-off, pooling, connector.",
    tier: "Data",
    badge: "✅ Local decision table",
    color: "bg-violet-600",
  },
  {
    href: "/gcp/firebase-vs-gcp",
    title: "Firebase vs GCP",
    desc: "When Firebase helps, when pure GCP wins.",
    tier: "Concept",
    badge: "✅ Local explainer",
    color: "bg-cyan-600",
  },
  {
    href: "/gcp/bff-dashboard",
    title: "BFF: Status Dashboard",
    desc: "One endpoint aggregating bucket + Firestore + secrets, degrades gracefully.",
    tier: "BFF",
    badge: "✅ Live aggregate · degrades without ADC",
    color: "bg-rose-600",
  },
  {
    href: "/gcp/bff-upload-ticket",
    title: "BFF: Upload Ticket",
    desc: "One action: signed URL + pre-registered Firestore doc.",
    tier: "BFF",
    badge: "✅ Live ticket · needs bucket",
    color: "bg-orange-600",
  },
];

export default function Page() {
  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
        ← Dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">GCP for Full-Stack — local-first playground</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Five <b>Demos</b> for the interview-highest-yield GCP <b>Skills</b>: deploy Next.js to Cloud Run, upload to
          GCS without leaking keys, read secrets via Secret Manager + IAM, pick Cloud SQL vs Firestore, and explain
          Firebase vs GCP. <b>Local-first</b>: every demo renders with zero credentials; <code>code</code> column is
          copy-ready <code>gcloud</code> + Node SDK for when you have a project.
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-sm font-semibold">How local-first works</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs">
          <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
            <div className="font-bold text-emerald-700 dark:text-emerald-300">✅ Local demo</div>
            <div className="mt-1 text-zinc-600 dark:text-zinc-400">
              Dockerfile preview, command builder, flow diagram, env-naming table, decision quiz. No billing, no
              GOOGLE_* envs.
            </div>
          </div>
          <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
            <div className="font-bold text-blue-700 dark:text-blue-300">📋 Code + CLI</div>
            <div className="mt-1 text-zinc-600 dark:text-zinc-400">
              Each page has <code>gcloud</code> CLI + <code>@google-cloud/*</code> snippet. Paste into a real project
              to go live.
            </div>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
            <div className="font-bold text-amber-700 dark:text-amber-300">🔒 No secrets here</div>
            <div className="mt-1 text-zinc-600 dark:text-zinc-400">
              Secrets stay server-only. Never <code>NEXT_PUBLIC_</code> a secret. See <Link href="/gcp/secrets" className="underline">/gcp/secrets</Link>.
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {concepts.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center gap-2">
              <span className={`inline-flex h-2 w-2 rounded-full ${c.color}`} />
              <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">{c.tier}</span>
              <span className="ml-auto text-xs text-zinc-400 group-hover:text-zinc-600">→</span>
            </div>
            <div className="text-base font-semibold leading-tight">{c.title}</div>
            <div className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{c.desc}</div>
            <div className="mt-auto rounded-lg bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {c.badge}
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CodeBlock
          lang="bash"
          code={`
# Go-live checklist (needs a GCP project + billing)
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com storage.googleapis.com secretmanager.googleapis.com sqladmin.googleapis.com

# Cloud Run deploy from repo root
gcloud run deploy interview-lab --source . --region europe-west1 --allow-unauthenticated
`}
        />
        <Callout title="Interview script (30s)">
          “I keep a local-first GCP lab: Cloud Run for deploy, GCS presigned uploads from a Server Action, Secret
          Manager + IAM for server-only secrets, and I can argue Cloud SQL vs Firestore. Demos run with zero creds;
          each page has the gcloud command and SDK snippet to go live.”
        </Callout>
      </div>
    </div>
  );
}
