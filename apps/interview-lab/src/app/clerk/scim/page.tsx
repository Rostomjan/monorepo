import { Callout, CodeBlock, DemoCard } from "../../components/CodeBlock";
import { DemoShell } from "../../components/DemoShell";

export const metadata = { title: "SCIM" };

export default function Page() {
  return (
    <DemoShell
      title="SCIM — Automated User Provisioning"
      intro="SCIM = System for Cross-domain Identity Management. IdP (Okta) pushes create/update/deactivate users to your app automatically — no CSV. Enterprise feature, not on Free."
      demo={
        <>
          <DemoCard title="❌ Free tier: not available — what you’ll see">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Dashboard → <b>Enterprise → Provisioning → SCIM</b> → banner “SCIM is available on <b>Enterprise</b> plans”. No endpoint is generated on Free; the <code>/v1/scim/v2/Users</code> endpoint returns 402. You can still explain and show backend stub.
            </p>
            <div className="mt-2 text-xs text-zinc-500">
              Pricing: Clerk SCIM is an Enterprise add-on (custom — contact sales). Interview: mention it sits on top of SSO.
            </div>
          </DemoCard>

          <DemoCard title="How SCIM works (diagram)">
            <div className="rounded-lg bg-zinc-950 p-4 text-[12px] leading-relaxed text-zinc-300">
              <div>Okta/Azure → (SCIM Bearer token + Base URL) → Clerk SCIM endpoint</div>
              <div className="mt-2">• <b>POST /v1/scim/v2/Users</b> — create</div>
              <div>• <b>PUT /v1/scim/v2/Users/:id</b> — update (name, role)</div>
              <div>• <b>PATCH /v1/scim/v2/Users/:id</b> — deactivate / re-activate</div>
              <div>• <b>GET /v1/scim/v2/Users</b> — list</div>
              <div className="mt-2">Clerk → maps to <code>clerkClient.users.create/ update/ ban</code> + org membership. Deprovision → session revoked via <code>auth().protect()</code> next request.</div>
            </div>
          </DemoCard>

          <DemoCard title="What’s free as alternative: clerkClient users API">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              On Free you provision via backend API + invitation email (no IdP sync). Works for demo and interview:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
              <li>Invite via <code>clerkClient.organizations.createOrganizationInvitation</code></li>
              <li>Manual <code>clerkClient.users.createUser</code> + assign org</li>
            </ul>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            lang="tsx"
            code={`
// Free alternative — manual provisioning (works on Free tier)
"use server"
import { clerkClient } from "@clerk/nextjs/server"
import { auth } from "@clerk/nextjs/server"

export async function inviteMember(email: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error("No org")
  const client = await clerkClient()
  await client.organizations.createOrganizationInvitation({
    organizationId: orgId,
    emailAddress: email,
    role: "org:member",
  })
}

// SCIM — Enterprise only (conceptual, requires Enterprise plan to enable)
// Dashboard: Enterprise → Provisioning → Enable SCIM → copy
//   SCIM endpoint: https://api.clerk.com/v1/scim/v2
//   Bearer token:  clerk_scim_... (from dashboard)
// Configure in Okta: Directory → Provisioning → Integration → SCIM 2.0
// Then Okta does:
//   POST https://api.clerk.com/v1/scim/v2/Users
//   { userName: "alice@acme.com", name: { givenName: "Alice" }, active: true }
// Clerk maps SCIM -> internal users + org memberships.
// You can verify via:
//   GET /v1/organizations/:id/memberships (via clerkClient)
`}
          />
          <Callout title="Interviewer expects">
            “SCIM is <b>not Free</b> — it’s an Enterprise add-on for IdP-driven provisioning. On Free I’d demo manual invitations with <code>clerkClient.organizations.createOrganizationInvitation</code> and describe SCIM as Okta → Clerk SCIM endpoint → auto <code>createUser + membership</code>. Disable via SCIM PATCH active=false → user banned next <code>auth()</code> call.”
          </Callout>
        </>
      }
      interview={
        <Callout title="Key nuance">
          SCIM requires SSO first (SAML/OIDC). Audit trail for SCIM events goes to Audit Logs (also paid) — chain the two concepts in interview.
        </Callout>
      }
    />
  );
}
