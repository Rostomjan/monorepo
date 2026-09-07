import { auth } from "@clerk/nextjs/server";
import { Show } from "@clerk/nextjs";
import { Callout, CodeBlock, DemoCard } from "../../components/CodeBlock";
import { DemoShell } from "../../components/DemoShell";

export const metadata = { title: "Multi-tenant Applications" };

export default async function Page() {
  const { orgId, orgSlug, has, userId } = await auth();

  return (
    <DemoShell
      title="Multi-tenant Applications"
      intro="Multi-tenant = one deployment serves many customers, each isolated by orgId. Clerk organizations are tenants. Free tier fully supports multi-tenancy via orgs + proxy routing."
      demo={
        <>
          <DemoCard title="✅ Live — Your tenant (org) context">
            {!userId ? (
              <p className="text-sm text-amber-600">
                Signed out → sign in + create org at <a href="/clerk/organizations" className="underline">/clerk/organizations</a>.
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                <div>
                  tenantId = <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">{orgId ?? "— personal (no tenant)"}</code>
                </div>
                <div>
                  slug = <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">{orgSlug ?? "—"}</code>
                </div>
                <div className="text-xs text-zinc-500">
                  Data isolation: always filter by <code>orgId</code> (or <code>userId</code> when personal). Same DB, row-level <code>tenant_id = orgId</code>.
                </div>
              </div>
            )}
            <div className="mt-3">
              <Show when={{ role: "org:admin" }}>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
                  ✅ Tenant admin view — visible only to <code>org:admin</code> of this tenant.
                </div>
              </Show>
            </div>
          </DemoCard>

          <DemoCard title="Pattern — slug routing (Free)">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              URL: <code>/o/[orgSlug]/dashboard</code> → middleware validates <code>auth().orgSlug</code> matches param. Prevents cross-tenant idor.
            </p>
          </DemoCard>

          <DemoCard title="Isolation checklist">
            <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
              <li>All queries: <code>where: {`{ tenantId: orgId ?? userId }`}</code></li>
              <li>
                Proxy: <code>clerkMiddleware</code> enforces <code>await auth().protect()</code> per tenant route
              </li>
              <li>Invites scoped to orgId — no cross-tenant leak</li>
            </ul>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            lang="tsx"
            code={`
// ✅ Multi-tenant — Free via organizations (tenant = org)

// 1. Proxy — slug validation (prevent tenant hopping)
import { clerkMiddleware } from "@clerk/nextjs/server"
export default clerkMiddleware(async (auth, req) => {
  const { orgSlug } = await auth()
  const slug = req.nextUrl.pathname.split("/")[2] // /o/[slug]/...
  if (req.nextUrl.pathname.startsWith("/o/") && orgSlug !== slug) {
    return (await auth()).redirectToSignIn()
  }
})

// 2. Server isolation
import { auth } from "@clerk/nextjs/server"
export default async function TenantDashboard({ params }: { params: { orgSlug: string } }) {
  const { orgId, userId, has } = await auth()
  // Enforce tenant match
  const { orgSlug } = await auth()
  if (orgSlug !== params.orgSlug) throw new Error("Forbidden — tenant mismatch")

  // Row-level isolation — same DB, tenant_id filter
  const invoices = await db.invoice.findMany({
    where: { tenantId: orgId ?? userId!, status: "open" },
  })

  // Permission still per-tenant
  const canBilling = has({ permission: "org:billing:manage" })
  return <TenantView invoices={invoices} canBilling={canBilling} />
}

// 3. Client tenant switcher
import { OrganizationSwitcher } from "@clerk/nextjs"
<OrganizationSwitcher hidePersonal />
`}
          />
          <Callout title="Interviewer expects">
            “Multi-tenancy on Free = <b>organizations as tenants</b>. TenantId is <code>auth().orgId</code> (or <code>userId</code> for personal). Enforce via <code>clerkMiddleware</code> slug check + DB <code>tenant_id</code> filter. Mention <code>hidePersonal</code> to force org context for B2B, and that billing (per-tenant Stripe) is separate but Free tier covers the isolation.”
          </Callout>
        </>
      }
      interview={
        <Callout title="Personal vs Strict">
          Free allows both personal + org. For pure B2B, set Dashboard → Organizations → disable personal, and use <code>&lt;OrganizationSwitcher hidePersonal /&gt;</code>.
        </Callout>
      }
    />
  );
}
