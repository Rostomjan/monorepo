import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { Callout, CodeBlock, DemoCard } from "../../components/CodeBlock";
import { DemoShell } from "../../components/DemoShell";
import { InviteForm, SuspendButtons } from "./Client";
import Link from "next/link";

export const metadata = { title: "User Lifecycle Management" };

export default async function Page() {
  const user = await currentUser();
  const { userId } = await auth();

  return (
    <DemoShell
      title="User Lifecycle Management"
      intro="Lifecycle = create → invite → verify → update → suspend/ban → restore → delete (GDPR). All via dashboard or clerkClient backend SDK. Free tier except SCIM auto-provision (enterprise)."
      demo={
        <>
          <DemoCard title="✅ Live — Your user (Free)">
            {!user ? (
              <p className="text-sm text-amber-600">
                Signed out → <Link href="/sign-in" className="underline">sign in</Link>.
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                <div>
                  id: <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">{user.id}</code>
                </div>
                <div>email: {user.emailAddresses[0]?.emailAddress}</div>
                <div>banned: {String(Boolean((user as any).banned))} · locked: {String(Boolean((user as any).locked))}</div>
                <p className="text-xs text-zinc-500">Managed via Dashboard → Users → select user → Ban / Unlock / Delete.</p>
              </div>
            )}
          </DemoCard>

          <DemoCard title="✅ Invite & membership (Free)">
            {!userId ? (
              <p className="text-sm text-zinc-500">Sign in + create org to invite.</p>
            ) : (
              <InviteForm />
            )}
          </DemoCard>

          <DemoCard title="✅ Suspend / Restore / Delete (Free, server)">
            {!userId ? (
              <p className="text-sm text-zinc-500">Sign in to test (you can ban yourself — demo re-login).</p>
            ) : (
              <SuspendButtons />
            )}
            <p className="mt-2 text-xs text-zinc-500">
              Calls run in Server Actions (<code>clerkClient.users.banUser / unbanUser / deleteUser</code>) — free, immediate, next <code>auth()</code> returns 401.
            </p>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            lang="tsx"
            code={`
// ✅ Lifecycle — Free tier (dashboard + backend SDK)

// Create user (backend, e.g., after payment webhook)
import { clerkClient } from "@clerk/nextjs/server"
const client = await clerkClient()
const user = await client.users.createUser({
  emailAddress: ["alice@acme.com"],
  password: "TempPass123!",
  skipPasswordChecks: true,
})

// Invite to org (free)
await client.organizations.createOrganizationInvitation({
  organizationId: orgId,
  emailAddress: "alice@acme.com",
  role: "org:member",
})

// Update
await client.users.updateUser(userId, { firstName: "Alice", publicMetadata: { plan: "pro" } })

// Suspend / Ban (free) — blocks next auth()
await client.users.banUser(userId)
await client.users.unbanUser(userId)

// Delete — GDPR erasure (free)
await client.users.deleteUser(userId)

// Verify email (free)
await client.users.getUser(userId) // user.emailAddresses[0].verification.status === "verified"

// Webhook to sync lifecycle to your DB (free)
 // Dashboard: Webhooks → add https://app/api/webhooks/clerk
 // Events: user.created, user.updated, user.deleted, organizationMembership.created
`}
          />
          <Callout title="Interviewer expects">
            “Lifecycle is <b>free</b> — I’d show Dashboard’s <b>Users → Ban/Delete</b> plus backend <code>clerkClient.users.*</code> in Server Actions. SCIM auto-create is the <b>paid</b> alternative (see <Link href="/clerk/scim" className="underline">/clerk/scim</Link>). Mention webhooks for syncing to your <code>users</code> table and that <code>banUser</code> invalidates session immediately.”
          </Callout>
        </>
      }
      interview={
        <Callout title="GDPR & Session">
          <code>deleteUser</code> erases PII; <code>banUser</code> keeps row but blocks <code>auth()</code>. Both are audited (paid Audit Logs) or via webhooks (free).
        </Callout>
      }
    />
  );
}
