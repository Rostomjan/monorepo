import { auth } from "@clerk/nextjs/server";
import { Show } from "@clerk/nextjs";
import { Callout, CodeBlock, DemoCard } from "../../components/CodeBlock";
import { DemoShell } from "../../components/DemoShell";
import Link from "next/link";

export const metadata = { title: "Fine-Grained Authorization" };

export default async function Page() {
  const { has, userId } = await auth();
  const can = {
    manageBilling: has({ permission: "org:billing:manage" }),
    createInvoice: has({ permission: "org:invoices:create" }),
    triple: has({ permission: "org:billing:manage" }) && has({ role: "org:admin" }),
  };

  return (
    <DemoShell
      title="Fine-Grained Authorization — Permissions"
      intro="Beyond roles: permissions like org:billing:manage, org:invoices:create. Checked via has({ permission }) or has(has => …). Free tier: custom permissions attached to roles, evaluated via has()."
      demo={
        <>
          <DemoCard title="✅ Live — Your permissions (Free)">
            {!userId ? (
              <p className="text-sm text-amber-600">
                Signed out → <Link href="/sign-in" className="underline">sign in</Link> + join org with permissions.
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-2 py-1 text-xs ${can.manageBilling ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                    org:billing:manage = {String(can.manageBilling)}
                  </span>
                  <span className={`rounded-full px-2 py-1 text-xs ${can.createInvoice ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-500"}`}>
                    org:invoices:create = {String(can.createInvoice)}
                  </span>
                  <span className={`rounded-full px-2 py-1 text-xs ${can.triple ? "bg-violet-100 text-violet-700" : "bg-zinc-100 text-zinc-500"}`}>
                    billing+admin = {String(can.triple)}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">Add permissions in Dashboard → Roles → select role → Permissions.</p>
              </div>
            )}
            <div className="mt-3 space-y-2">
              <Show when={{ permission: "org:billing:manage" }}>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
                  ✅ Has <code>org:billing:manage</code> → billing settings visible.
                </div>
              </Show>
              <Show when={{ permission: "org:invoices:create" }}>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/40">
                  ✅ Has <code>org:invoices:create</code> → “New invoice” button enabled.
                </div>
              </Show>
              <Show when={(has: any) => has({ permission: "org:billing:manage" }) && has({ role: "org:admin" })}>
                <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm dark:border-violet-900 dark:bg-violet-950/40">
                  ✅ <code>has =&gt; has(permission) &amp;&amp; has(role)</code> → composite check passed.
                </div>
              </Show>
            </div>
          </DemoCard>

          <DemoCard title="How permissions attach (Free)">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Dashboard → <b>Roles</b> → create role (e.g., <code>billing</code>) → <b>Permissions</b> → + <code>org:billing:manage</code>. Assign role to member. Or via API:
            </p>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            lang="tsx"
            code={`
// ✅ Fine-grained — Free, via permissions + has()
// Dashboard: Roles → Edit → Permissions → add "org:billing:manage", "org:invoices:create"
// Assign role to user (org membership)

// Single permission
import { Show } from "@clerk/nextjs"
<Show when={{ permission: "org:billing:manage" }}>
  <BillingPanel />
</Show>

// Direct has() in server
import { auth } from "@clerk/nextjs/server"
export async function loader() {
  const { has } = await auth()
  if (!has({ permission: "org:invoices:create" })) return null
  return <NewInvoiceButton />
}

// Composite predicate (fine-grained)
<Show when={(has) => has({ permission: "org:billing:manage" }) && has({ role: "org:admin" })}>
  <AdminBilling />
</Show>

// Multiple permissions (any vs all — implement via predicate)
<Show when={(has) => has({ permission: "org:billing:read" }) || has({ permission: "org:billing:manage" })}>
  <BillingRead />
</Show>

// Protect route by permission
await auth().protect({ permission: "org:billing:manage" })
// or in proxy:
// export default clerkMiddleware(async (auth, req) => {
//   if (req.nextUrl.pathname.startsWith("/billing")) {
//     await auth.protect({ permission: "org:billing:manage" })
//   }
// })
`}
          />
          <Callout title="Interviewer expects">
            “Permissions are <b>free</b> — attach <code>org:*</code> to roles in dashboard, check with <code>has()</code> or predicate <code>has =&gt; has()</code>. Mention namespacing <code>org:</code> is convention; you can also use <code>feature</code>/<code>plan</code>. For interview: role = coarse, permission = fine; always check server with <code>auth().protect()</code> for Route Handlers.”
          </Callout>
        </>
      }
      interview={
        <Callout title="Why not RBAC alone?">
          RBAC answers “is admin?”, fine-grained answers “can do X on Y?” — invoice create vs billing manage separation.
        </Callout>
      }
    />
  );
}
