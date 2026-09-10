import { auth, clerkClient } from "@clerk/nextjs/server";
import { Show } from "@clerk/nextjs";
import { Callout, CodeBlock, DemoCard } from "../../components/CodeBlock";
import { DemoShell } from "../../components/DemoShell";
import Link from "next/link";

export const metadata = { title: "RBAC" };

async function getRole() {
  const { has, userId, orgId } = await auth();
  if (!userId) return { signedIn: false as const };
  return {
    signedIn: true as const,
    orgId: orgId ?? null,
    isAdmin: has({ role: "org:admin" }),
    isMember: has({ role: "org:member" }),
  };
}

export default async function Page() {
  const r = await getRole();

  return (
    <DemoShell
      title="RBAC — Roles"
      intro="RBAC = Role-Based Access Control. Ready-made roles: org:admin, org:member + custom roles (e.g., billing). Checks via Show or has(). Entirely FREE on Clerk Free tier."
      demo={
        <>
          <DemoCard title="✅ Live — Your current role (Free)">
            {!r.signedIn ? (
              <p className="text-sm text-amber-600">
                Signed out → <Link href="/sign-in" className="underline">sign in</Link> then create/join an org at{" "}
                <Link href="/clerk/organizations" className="underline">/clerk/organizations</Link> to test.
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                <div>
                  orgId: <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">{r.orgId ?? "— (no org)"}</code>
                </div>
                <div className="flex gap-2">
                  <span className={`rounded-full px-2 py-1 text-xs ${r.isAdmin ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                    org:admin = {String(r.isAdmin)}
                  </span>
                  <span className={`rounded-full px-2 py-1 text-xs ${r.isMember ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-500"}`}>
                    org:member = {String(r.isMember)}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">Switch org/role via OrganizationSwitcher or dashboard → Org → Members → edit role.</p>
              </div>
            )}
            <div className="mt-3 grid gap-2">
              <Show when={{ role: "org:admin" }}>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40">
                  ✅ You are <b>org:admin</b> → admin panel visible (via <code>Show{" when={{ role: 'org:admin' }}"}</code>).
                </div>
              </Show>
              <Show when={{ role: "org:member" }}>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40">
                  ✅ You are <b>org:member</b> → member view.
                </div>
              </Show>
              {!r.signedIn || (!r.isAdmin && !r.isMember) ? (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800">
                  No org role → neither panel. Join an org to get a role.
                </div>
              ) : null}
            </div>
          </DemoCard>

          <DemoCard title="How roles are set (Free)">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Dashboard → <b>Organizations → any org → Members</b> → edit role → <code>org:admin</code> / <code>org:member</code> or custom (e.g.,{" "}
              <code>support</code>). Or via backend:
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Invite with role: <code>clerkClient.organizations.createOrganizationInvitation{`{ role }`}</code> — works on Free.
            </p>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            lang="tsx"
            code={`
// ✅ RBAC — Free tier, org roles (admin/member + custom)
// Server component / Route Handler
import { auth } from "@clerk/nextjs/server"
import { Show } from "@clerk/nextjs"

export default async function AdminPage() {
  const { has, userId } = await auth()
  if (!userId) return (await auth()).redirectToSignIn()

  // has() — single role check
  const isAdmin = has({ role: "org:admin" })
  if (!isAdmin) return <p>403 — admins only</p>

  return <AdminPortal />
}

// JSX declarative — Show
export function Panel() {
  return (
    <>
      <Show when={{ role: "org:admin" }}>
        <AdminTools />
      </Show>
      <Show when={{ role: "org:member" }}>
        <MemberView />
      </Show>
    </>
  )
}

// Protect route imperatively (edge via proxy or layout)
// app/(admin)/layout.tsx
import { auth } from "@clerk/nextjs/server"
export default async function Layout({ children }: { children: React.ReactNode }) {
  await auth().protect({ role: "org:admin" }) // redirects or 404
  return <>{children}</>
}

// Create custom role (dashboard: Roles → + New Role)
// Then check:
has({ role: "support" }) // custom
has({ role: "org:billing" }) // custom org role
`}
          />
          <Callout title="Interviewer expects">
            “RBAC is <b>free</b> — two built-ins (<code>org:admin</code>, <code>org:member</code>) + custom roles via dashboard. Check with <code>has()</code> or <code>Show</code> (Core 3). Protect layouts with <code>await auth().protect()</code>. Mention role is org-scoped — same user can be admin in one org, member in another.”
          </Callout>
        </>
      }
      interview={
        <Callout title="Free-tier proof">
          This page’s live badges use <code>auth().has</code> — no upgrade needed. Create org at <Link href="/clerk/organizations" className="underline">/clerk/organizations</Link> → invite yourself as admin/member → reload.
        </Callout>
      }
    />
  );
}
