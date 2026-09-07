import { auth, currentUser } from "@clerk/nextjs/server";
import { OrganizationSwitcher, CreateOrganization, OrganizationProfile } from "@clerk/nextjs";
import { Callout, CodeBlock, DemoCard } from "../../components/CodeBlock";
import { DemoShell } from "../../components/DemoShell";

export const metadata = { title: "Organization Management" };

export default async function Page() {
  const { orgId, orgSlug, orgRole } = await auth();
  const user = await currentUser();

  return (
    <DemoShell
      title="Organization Management"
      intro="Organizations = workspaces. Create, switch, manage members, roles. Free tier: full org CRUD + membership, up to 10k MAU. Demo live here."
      demo={
        <>
          <DemoCard title="✅ Live — Your org (Free)">
            {!user ? (
              <p className="text-sm text-amber-600">
                Signed out → <a href="/sign-in" className="underline">sign in</a> first.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="text-sm">
                  User: <b>{user.firstName ?? user.emailAddresses[0]?.emailAddress}</b> ·{" "}
                  org: <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">{orgSlug ?? orgId ?? "— none"}</code> · role:{" "}
                  <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">{orgRole ?? "—"}</code>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <OrganizationSwitcher afterCreateOrganizationUrl="/clerk/organizations" afterLeaveOrganizationUrl="/clerk/organizations" />
                </div>
                <p className="text-xs text-zinc-500">Switcher is free — use it to create/join orgs.</p>
              </div>
            )}
          </DemoCard>

          <DemoCard title="✅ Create organization (Free)">
            {user ? (
              <div className="rounded-lg border bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
                <CreateOrganization afterCreateOrganizationUrl="/clerk/organizations" />
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Sign in to create.</p>
            )}
          </DemoCard>

          <DemoCard title="✅ Manage members (Free)">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              After creating, click the org avatar → <b>Manage members</b> or use <code>OrganizationProfile</code> below (renders only when in org):
            </p>
            {orgId ? (
              <div className="mt-2">
                <OrganizationProfile />
              </div>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">Join/create an org to see the profile.</p>
            )}
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            lang="tsx"
            code={`
// ✅ Organizations — Free tier

import { OrganizationSwitcher, CreateOrganization, OrganizationProfile } from "@clerk/nextjs"
import { auth, clerkClient } from "@clerk/nextjs/server"

// Client: switcher / creator
<OrganizationSwitcher afterCreateOrganizationUrl="/clerk/organizations" />
<CreateOrganization />
<OrganizationProfile />

// Server: membership & role
import { auth } from "@clerk/nextjs/server"
export default async function Page() {
  const { orgId, orgSlug, orgRole, has } = await auth()
  // orgId null = personal context (no org)
  const isAdmin = has({ role: "org:admin" })
}

// Backend: invite / list (Free)
"use server"
import { clerkClient } from "@clerk/nextjs/server"
export async function invite(email: string) {
  const client = await clerkClient()
  await client.organizations.createOrganizationInvitation({
    organizationId: (await auth()).orgId!,
    emailAddress: email,
    role: "org:member",
  })
}
const members = await (await clerkClient()).organizations.getOrganizationMembershipList({
  organizationId: orgId!,
})
`}
          />
          <Callout title="Interviewer expects">
            “Orgs are <b>free</b> — <code>OrganizationSwitcher</code> for switching, <code>CreateOrganization</code> for creation, <code>OrganizationProfile</code> for admin. Server gets <code>auth().orgId/orgRole/has()</code>. Membership is <code>clerkClient.organizations.getOrganizationMembershipList</code>. Limit on Free is MAU, not org count — mention 10k MAU.”
          </Callout>
        </>
      }
      interview={
        <Callout title="Personal vs Org context">
          No <code>orgId</code> = personal workspace. After <code>OrganizationSwitcher</code> select, <code>orgId</code> is set in session cookie — next <code>auth()</code> reflects it. Use <code>auth().orgSlug</code> for pretty URLs (/orgSlug).
        </Callout>
      }
    />
  );
}
