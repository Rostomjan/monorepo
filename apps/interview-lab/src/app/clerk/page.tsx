import Link from "next/link";
import { CodeBlock, Callout } from "../components/CodeBlock";

export const metadata = { title: "Clerk Enterprise Concepts" };

const concepts = [
  {
    href: "/clerk/sso",
    title: "SSO (SAML / OIDC)",
    desc: "Social OIDC vs Enterprise SAML connections.",
    tier: "Mixed",
    badge: "⚠️ Social free · SAML paid",
    color: "bg-indigo-600",
  },
  {
    href: "/clerk/scim",
    title: "SCIM",
    desc: "Automated user provisioning from IdP.",
    tier: "Enterprise",
    badge: "❌ Paid — Enterprise",
    color: "bg-zinc-800",
  },
  {
    href: "/clerk/audit-logs",
    title: "Audit Logs",
    desc: "Who did what, when — compliance trail.",
    tier: "Pro+",
    badge: "❌ Paid — Pro/Scale",
    color: "bg-amber-600",
  },
  {
    href: "/clerk/rbac",
    title: "RBAC",
    desc: "Roles: admin, member, custom roles.",
    tier: "Free",
    badge: "✅ Free",
    color: "bg-emerald-600",
  },
  {
    href: "/clerk/fine-grained",
    title: "Fine-Grained Authorization",
    desc: "Permissions & has() checks.",
    tier: "Free",
    badge: "✅ Free",
    color: "bg-teal-600",
  },
  {
    href: "/clerk/organizations",
    title: "Organization Management",
    desc: "Create orgs, members, switcher.",
    tier: "Free",
    badge: "✅ Free — 10k MAU",
    color: "bg-blue-600",
  },
  {
    href: "/clerk/multi-tenant",
    title: "Multi-tenant Applications",
    desc: "One org = one tenant (B2B SaaS).",
    tier: "Free",
    badge: "✅ Free",
    color: "bg-violet-600",
  },
  {
    href: "/clerk/admin-portals",
    title: "Admin Portals",
    desc: "UserProfile, Org Profile, Admin UI.",
    tier: "Free",
    badge: "✅ Free",
    color: "bg-cyan-600",
  },
  {
    href: "/clerk/user-lifecycle",
    title: "User Lifecycle Management",
    desc: "Invite, suspend, restore, delete.",
    tier: "Free",
    badge: "✅ Free",
    color: "bg-rose-600",
  },
];

export default function Page() {
  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
        ← Dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clerk — Enterprise Concepts on the Free Tier</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          This hub explains 9 enterprise-grade concepts and what you can <b>actually demo today</b> on Clerk’s Free
          tier (10k MAU). Green = live demo in this lab, amber = mock/code-only, red = requires upgrade. No secret
          keys exposed — all checks use <code>auth()</code> / <code>Show</code> / <code>clerkClient</code>.
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-sm font-semibold">Free tier at a glance (2026)</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs">
          <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
            <div className="font-bold text-emerald-700 dark:text-emerald-300">✅ Free & demoable here</div>
            <div className="mt-1 text-zinc-600 dark:text-zinc-400">RBAC, fine-grained <code>has()</code>, orgs, multi-tenant, admin portals, lifecycle (create/suspend/delete via dashboard/backend)</div>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
            <div className="font-bold text-amber-700 dark:text-amber-300">⚠️ Partially free</div>
            <div className="mt-1 text-zinc-600 dark:text-zinc-400">SSO: social OIDC (Google/GitHub) free, <b>SAML/OIDC Enterprise</b> requires Pro/Enterprise.</div>
          </div>
          <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
            <div className="font-bold text-red-700 dark:text-red-300">❌ Paid only</div>
            <div className="mt-1 text-zinc-600 dark:text-zinc-400">SCIM provisioning and Audit Logs API/Dashboard require Pro/Enterprise. Explained with code & diagrams.</div>
          </div>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Verify in dashboard: <a href="https://dashboard.clerk.com" target="_blank" className="underline">dashboard.clerk.com</a> → your app → Billing / SSO connections / Audit Logs. Free tier = 10k MAU, no credit card.
        </p>
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
          lang="tsx"
          code={`
// Core pattern for every concept — server
import { auth, clerkClient } from "@clerk/nextjs/server"
import { Show } from "@clerk/nextjs"

export default async function Page() {
  const { userId, has, orgId, orgRole } = await auth()
  if (!userId) return <p>Signed out — free to test</p>

  // RBAC / fine-grained — FREE
  const canBilling = has({ permission: "org:billing:manage" })
  const isAdmin = has({ role: "org:admin" })

  // Server: fetch user — lifecycle FREE
  const user = await (await clerkClient()).users.getUser(userId)
  return <Show when={{ role: "org:admin" }}><AdminPortal user={user} /></Show>
}
`}
        />
        <Callout title="Interview script (30s)">
          “On Clerk Free I can demo org-based multi-tenancy, RBAC with <code>Show</code>/<code>has()</code>, lifecycle via <code>clerkClient</code>, and admin portals with prebuilt components. SAML/SCIM and Audit Logs are enterprise — I’d point to the dashboard’s SSO connections and the Audit Logs API, note they require Pro, and sketch the webhook/IdP flow on the whiteboard.”
        </Callout>
      </div>

      <Callout title="How this lab proves free-tier">
        Each subpage has a badge, a live demo when free (toggle roles, switch orgs, manage profile), and a “Requires upgrade” callout + dashboard path when paid. Search params / cookies are awaited (Next 15), <code>proxy.ts</code> uses <code>clerkMiddleware</code> — all builds pass on the 10k-MAU free tier.
      </Callout>
    </div>
  );
}
