import { Callout, CodeBlock, DemoCard } from "../../components/CodeBlock";
import { DemoShell } from "../../components/DemoShell";

export const metadata = { title: "Firebase vs GCP" };

export default function Page() {
  return (
    <DemoShell
      title="Firebase vs GCP"
      intro="Firebase = batteries-included app backend (Auth, Firestore, Hosting, Functions). Pure GCP = primitives (Run, GCS, SQL, IAM). This lab is pure GCP because auth here is already Clerk."
      demo={
        <>
          <DemoCard title="When which? (local explainer)">
            <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
              <li><b>Pick Firebase</b> — solo MVP, need Auth+DB+Hosting in an afternoon, client-first sync.</li>
              <li><b>Pick pure GCP</b> — custom Next.js on Run, Postgres relations, VPC, org IAM, B2B multi-tenant.</li>
              <li><b>This lab</b> — pure GCP + Clerk: Clerk owns identity, GCP owns compute/storage/data.</li>
            </ul>
          </DemoCard>
          <DemoCard title="Overlap map">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-zinc-500">
                    <th className="py-1 pr-2">Need</th>
                    <th className="py-1 pr-2">Firebase</th>
                    <th className="py-1">Pure GCP here</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="py-1 pr-2">Auth</td><td className="pr-2">Firebase Auth</td><td>Clerk (already)</td></tr>
                  <tr><td className="py-1 pr-2">DB</td><td className="pr-2">Firestore</td><td>Cloud SQL / Firestore</td></tr>
                  <tr><td className="py-1 pr-2">Files</td><td className="pr-2">Firebase Storage</td><td>GCS signed URLs</td></tr>
                  <tr><td className="py-1 pr-2">Host</td><td className="pr-2">Firebase Hosting</td><td>Cloud Run</td></tr>
                </tbody>
              </table>
            </div>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            lang="tsx"
            code={`
// Pure-GCP stance in this lab (no firebase deps)
// Auth: Clerk (server)
//   import { auth } from "@clerk/nextjs/server";
// Compute: Cloud Run (Docker, standalone)
// Files: GCS signed URL (@google-cloud/storage, server-only)
// Data: Cloud SQL (pg Pool, global) or Firestore
// Secrets: Secret Manager + IAM service account
`}
          />
          <Callout title="Interviewer expects">
            Firebase accelerates MVPs but couples Auth+DB+hosting opinions. Pure GCP composes primitives and fits
            existing Clerk + Next + Postgres stacks. Name the seam: identity (Clerk) vs platform (GCP).
          </Callout>
        </>
      }
      interview={
        <Callout title="One-liner">
          “Firebase when speed-to-MVP beats control; pure GCP + Clerk when I need Postgres relations, VPC/IAM control,
          and portable containers on Run.”
        </Callout>
      }
    />
  );
}
