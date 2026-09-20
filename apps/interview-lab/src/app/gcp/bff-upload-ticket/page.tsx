import { Callout, CodeBlock, DemoCard } from "../../components/CodeBlock";
import { DemoShell } from "../../components/DemoShell";
import { TicketDemo } from "./TicketDemo";

export const metadata = { title: "BFF: Upload Ticket" };

export default function Page() {
  return (
    <DemoShell
      title="BFF: Upload Ticket"
      intro="ONE Server Action returns everything the upload screen needs: signed URL + pre-registered Firestore doc. Compare with the Storage Demo (URL only) — the ticket binds storage intent to database state up front."
      demo={
        <>
          <DemoCard title="Try it — ticket then PUT">
            <TicketDemo />
            <p className="mt-2 text-xs text-zinc-500">
              Ticket docs land in <code className="font-mono">uploads</code> as <code>ticketed</code>. Practice
              cleanup: delete your ticket docs + uploaded objects after.
            </p>
          </DemoCard>
          <DemoCard title="Ticket vs plain signed URL">
            <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
              <li>Plain URL: storage allows the write; DB learns about it later (or never).</li>
              <li>Ticket: DB row exists first — quotas, ownership, and status are enforceable.</li>
              <li>Confirm step (not built): client notifies completion → doc flips to <code>uploaded</code>.</li>
            </ul>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            lang="tsx"
            code={`
// BFF: one action, frontend-shaped result across two backends
"use server";
export async function createUploadTicket({ filename, contentType }) {
  const [url] = await storage.bucket(BUCKET).file(objectName).getSignedUrl({...});
  const doc = await db.collection("uploads").add({ objectName, status: "ticketed", createdAt: ... });
  return { ok: true, url, objectName, docId: doc.id }; // single ticket for the screen
}
`}
          />
          <Callout title="Interviewer expects">
            Ticket pattern = bind intent across systems before the bytes move. Screen makes one call, gets one shaped
            object. Mention idempotency (client-generated ticket key), expiry alignment (URL 10 min vs doc TTL), and
            reconciling orphaned <code>ticketed</code> docs (scheduled sweep).
          </Callout>
        </>
      }
      interview={
        <Callout title="Mistakes to avoid">
          Don’t trust the client to report success — reconcile (list objects vs docs). Don’t mint without validating
          type/size policy server-side. Don’t leave <code>ticketed</code> docs forever — TTL or sweeper.
        </Callout>
      }
    />
  );
}
