import { Callout, CodeBlock, DemoCard } from "../../components/CodeBlock";
import { DemoShell } from "../../components/DemoShell";
import { FirestoreDemo } from "./FirestoreDemo";

export const metadata = { title: "Cloud SQL vs Firestore" };

export default function Page() {
  return (
    <DemoShell
      title="Cloud SQL vs Firestore"
      intro="SQL for relations + transactions; Firestore for document scale + realtime. Firestore Demo below is live (free tier); Cloud SQL stays code-only (smallest instance bills). Interviewers want the trade-off + how Next connects."
      demo={
        <>
          <DemoCard title="Try it — live Firestore (free tier)">
            <FirestoreDemo />
            <p className="mt-2 text-xs text-zinc-500">
              DB: native mode, europe-west1. <code>datastore.user</code> on <code>lab-signer</code> + your user. Cloud
              SQL intentionally not provisioned (costs ~$10/mo).
            </p>
          </DemoCard>
          <DemoCard title="Decision table (local, no DB needed)">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-zinc-500">
                    <th className="py-1 pr-2">Need</th>
                    <th className="py-1 pr-2">Pick</th>
                    <th className="py-1">Why</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="py-1 pr-2">Joins, transactions, Prisma</td><td className="pr-2">Cloud SQL Postgres</td><td>relational</td></tr>
                  <tr><td className="py-1 pr-2">Realtime feed, offline sync</td><td className="pr-2">Firestore</td><td>doc + listeners</td></tr>
                  <tr><td className="py-1 pr-2">Bursty Next serverless</td><td className="pr-2">SQL + pooler</td><td>avoid conn storm</td></tr>
                  <tr><td className="py-1 pr-2">Simple KV / sessions</td><td className="pr-2">Firestore / Memorystore</td><td>low ops</td></tr>
                </tbody>
              </table>
            </div>
          </DemoCard>
          <DemoCard title="Scenario quiz">
            <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
              <li><b>B2B invoices + refunds?</b> → SQL (ACID, joins).</li>
              <li><b>Chat presence / live comments?</b> → Firestore (realtime).</li>
              <li><b>Cloud Run min-instances 0 + SQL?</b> → need pooled connector, else cold-start + max-connections.</li>
            </ul>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            lang="tsx"
            code={`
// Cloud SQL via connector — reuse pool across invocations (global)
import { Connector } from "@google-cloud/cloud-sql-connector";
import { Pool } from "pg";

const connector = new Connector();
const globalPool = (globalThis as any).__pgPool ?? null;

export async function getPool() {
  if (globalPool) return globalPool;
  const opts = await connector.getOptions({ instanceConnectionName: process.env.INSTANCE_CN!, ipType: "PUBLIC" });
  const pool = new Pool({ ...opts, user: "app", password: process.env.DB_PASS, database: "app", max: 5 });
  (globalThis as any).__pgPool = pool;
  return pool;
}
// Firestore
// import { Firestore } from "@google-cloud/firestore";
// const db = new Firestore(); db.collection("posts").doc(id).get()
`}
          />
          <CodeBlock
            lang="bash"
            code={`
# Cloud SQL Postgres (one-time)
gcloud sql instances create app-db --database-version POSTGRES_16 --tier db-f1-micro --region europe-west1
gcloud sql databases create app --instance app-db
# Private IP preferred for Run in same VPC; PUBLIC + connector for lab
`}
          />
          <Callout title="Interviewer expects">
            SQL = joins/transactions/schema, needs pooling on serverless. Firestore = scale-out docs, realtime, weaker
            queries. Mention connector/IAM auth, global pool reuse, and placing Run + SQL in same region.
          </Callout>
        </>
      }
      interview={
        <Callout title="Mistakes to avoid">
          Don’t open a new SQL pool per request (exhausts connections). Don’t model highly-relational data in
          Firestore (fan-out pain). Don’t put Run and SQL in different regions (latency + egress).
        </Callout>
      }
    />
  );
}
