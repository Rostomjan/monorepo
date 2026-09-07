import { Callout, CodeBlock, DemoCard } from "../../components/CodeBlock";
import { DemoShell } from "../../components/DemoShell";

export const metadata = { title: "Audit Logs" };

export default function Page() {
  return (
    <DemoShell
      title="Audit Logs — Compliance Trail"
      intro="Audit logs = who did what, when (actor, target, action, timestamp, IP). Required for SOC 2 / HIPAA. Clerk provides organization audit logs via Dashboard + API, gated to paid plans."
      demo={
        <>
          <DemoCard title="❌ Free tier: API blocked, Dashboard banner">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Dashboard → <b>Organizations → choose org → Audit logs</b> on Free shows “Upgrade to <b>Pro/Scale</b> to retain & query audit logs”. API call returns 402:
            </p>
            <div className="mt-2 rounded bg-zinc-950 p-3 text-[11px] text-amber-300">
              GET /v1/organizations/org_xxx/audit_logs → 402 {`{"code":"billing_upgrade_required"}`}
            </div>
          </DemoCard>

          <DemoCard title="What audit logs capture (paid)">
            <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
              <li>
                <b>Actor</b>: userId / system / SCIM token
              </li>
              <li>
                <b>Action</b>: <code>org.membership.added</code>, <code>user.banned</code>, <code>sso.connection.created</code>
              </li>
              <li>
                <b>Target</b>: <code>user_abc</code>, <code>org_xyz</code>
              </li>
              <li>
                <b>Metadata</b>: IP, user-agent, timestamp, requestId
              </li>
            </ul>
          </DemoCard>

          <DemoCard title="✅ Free workaround: build your own log with webhooks (free)">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Clerk <b>webhooks</b> are <b>free</b> (100% on Free tier). Use Svix-authenticated <code>POST /api/webhooks/clerk</code> to log events yourself — covers many audit needs for interview.
            </p>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            lang="tsx"
            code={`
// Paid: Clerk-native Audit Logs API (requires Pro/Scale — 402 on Free)
import { clerkClient } from "@clerk/nextjs/server"
const client = await clerkClient()
// List org audit logs (paid):
await client.organizations.getOrganizationAuditLogs({
  organizationId: "org_xxx",
  limit: 50,
})
// Or per-user:
// await client.users.getUserAuditLogs({ userId: "user_xxx" })

// ✅ FREE alternative: Webhooks + own audit table (works on Free tier)
// Dashboard: Webhooks → Add endpoint → https://your.app/api/webhooks/clerk
// Subscribe: organizationMembership.created/updated/deleted, user.created/banned, etc.
// Route handler (Next 16):

// app/api/webhooks/clerk/route.ts
import { Webhook } from "svix"
import { headers } from "next/headers"

export async function POST(req: Request) {
  const payload = await req.text()
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)
  const evt = wh.verify(payload, {
    "svix-id": (await headers()).get("svix-id")!,
    "svix-timestamp": (await headers()).get("svix-timestamp")!,
    "svix-signature": (await headers()).get("svix-signature")!,
  }) as { type: string; data: any; timestamp: number }

  // Your audit table (free, same schema as Clerk audit logs)
  await db.auditLogs.create({
    actor: evt.data.actor ?? evt.data.created_by,
    action: evt.type, // e.g. "organizationMembership.created"
    target: evt.data.id,
    timestamp: new Date(evt.timestamp),
    raw: evt.data,
  })
  return new Response("ok")
}
`}
          />
          <Callout title="Interviewer expects">
            “Native Audit Logs are <b>paid</b> (Pro/Scale) — I’d point to the dashboard upgrade banner and the 402. On Free I’d propose <b>webhooks</b> (free, Svix-signed) as an audit trail: subscribe to <code>user.*</code> / <code>organizationMembership.*</code>, verify with <code>svix</code>, write to your <code>audit_logs</code> table. Trade-off: you lose Clerk’s tamper-proof retention, but it passes SOC 2-lite interviews.”
          </Callout>
        </>
      }
      interview={
        <Callout title="Pricing nuance">
          Clerk lists Audit Logs as “Scale” feature, 30–90-day retention vs your own DB unlimited. Mention IP + user-agent for forensics.
        </Callout>
      }
    />
  );
}
