import { Callout, CodeBlock, DemoCard } from "../../components/CodeBlock";
import { DemoShell } from "../../components/DemoShell";
import { auth } from "@clerk/nextjs/server";
import { UserProfile } from "@clerk/nextjs";

export const metadata = { title: "Admin Portals" };

export default async function Page() {
  const { userId } = await auth();

  return (
    <DemoShell
      title="Admin Portals — UserProfile & OrganizationProfile"
      intro="Admin portals = self-serve UIs for users to manage their own account and org admins to manage the tenant. Clerk ships prebuilt components — no custom CRUD needed. Free tier."
      demo={
        <>
          <DemoCard title="✅ Live — User portal (Free, signed-in only)">
            {!userId ? (
              <p className="text-sm text-amber-600">
                Signed out → <a href="/sign-in" className="underline">sign in</a> to see your portal.
              </p>
            ) : (
              <div className="rounded-xl border bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
                <UserProfile routing="hash" />
              </div>
            )}
            <p className="mt-2 text-xs text-zinc-500">
              <code>UserProfile</code> handles email, password, 2FA, connected accounts, delete — all client-side, no backend.
            </p>
          </DemoCard>

          <DemoCard title="✅ Org admin portal (Free)">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Go to <a href="/clerk/organizations" className="underline">/clerk/organizations</a> → scroll to <b>OrganizationProfile</b> → manages domain, members, roles, SSO, SCIM (upgrade banner shows for paid).
            </p>
            <div className="mt-2 text-xs text-zinc-500">
              Invite, remove, change role, verify domain — all via <code>OrganizationProfile</code>. Wraps <code>clerkClient.organizations.*</code> calls.
            </div>
          </DemoCard>

          <DemoCard title="Custom admin page (when you need more)">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              For custom tables, use <code>clerkClient</code> server-side + <code>Show</code> gate:
            </p>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            lang="tsx"
            code={`
// ✅ Admin portals — Free, prebuilt

// User portal (personal)
import { UserProfile } from "@clerk/nextjs"
export default function AccountPage() {
  return <UserProfile routing="hash" />
  // routing: "hash" | "path" — no extra config
}

// Org admin portal (tenant)
import { OrganizationProfile } from "@clerk/nextjs"
export default function OrgAdmin() {
  return <OrganizationProfile routing="hash" />
  // Members, roles, invitations, domain verification
}

// Custom admin table — still Free via backend SDK
import { auth, clerkClient } from "@clerk/nextjs/server"
import { Show } from "@clerk/nextjs"

export default async function CustomAdmin() {
  await auth().protect({ role: "org:admin" }) // gate

  const client = await clerkClient()
  const { data: memberships } =
    await client.organizations.getOrganizationMembershipList({
      organizationId: (await auth()).orgId!,
    })

  return (
    <Show when={{ role: "org:admin" }}>
      <table>
        {memberships.map((m) => (
          <tr key={m.id}>
            <td>{m.publicUserData?.identifier}</td>
            <td>{m.roleName}</td>
          </tr>
        ))}
      </table>
    </Show>
  )
}
`}
          />
          <Callout title="Interviewer expects">
            “Admin portals are <b>free</b> — drop in <code>UserProfile</code> and <code>OrganizationProfile</code> (hash or path routing). For custom, use <code>clerkClient.organizations.*</code> + <code>Show</code> gate. Mention <code>routing=&quot;hash&quot;</code> avoids Next route conflicts.”
          </Callout>
        </>
      }
      interview={
        <Callout title="When to go custom?">
          Prebuilt covers 90%. Custom when you need bulk actions, analytics, or non-Clerk data joined (e.g., invoices per member).
        </Callout>
      }
    />
  );
}
