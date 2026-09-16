import { Callout, CodeBlock, DemoCard } from "../../components/CodeBlock";
import { DemoShell } from "../../components/DemoShell";

export const metadata = { title: "Secret Manager + IAM" };

export default function Page() {
  return (
    <DemoShell
      title="Secret Manager + IAM"
      intro="Secrets live in Secret Manager, accessed server-only via service-account IAM. NEXT_PUBLIC_ is baked into client JS — never put a secret there. Local demo is a naming/redaction table."
      demo={
        <>
          <DemoCard title="Naming rule (local check)">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-zinc-500">
                    <th className="py-1 pr-2">Var</th>
                    <th className="py-1 pr-2">Where</th>
                    <th className="py-1">OK?</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  <tr><td className="py-1 pr-2">DATABASE_URL</td><td className="pr-2">server-only</td><td>✅ secret</td></tr>
                  <tr><td className="py-1 pr-2">GCS_BUCKET</td><td className="pr-2">server-only</td><td>✅ non-secret config</td></tr>
                  <tr><td className="py-1 pr-2">NEXT_PUBLIC_API_URL</td><td className="pr-2">client</td><td>✅ public only</td></tr>
                  <tr><td className="py-1 pr-2">NEXT_PUBLIC_STRIPE_SECRET</td><td className="pr-2">client ❌</td><td>❌ leaked to JS</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Rule: <code>NEXT_PUBLIC_</code> = shipped to browser. If it’s secret, keep it server-only + Secret
              Manager.
            </p>
          </DemoCard>
          <DemoCard title="IAM mental model">
            <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
              <li>Service account = identity for Cloud Run revision.</li>
              <li>Grant <code>roles/secretmanager.secretAccessor</code> on one secret, not whole project.</li>
              <li>Locally: <code>GOOGLE_APPLICATION_CREDENTIALS</code>; on Run: workload identity (no JSON).</li>
            </ul>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            lang="tsx"
            code={`
// Server-only read — never import this file from "use client"
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const client = new SecretManagerServiceClient();

export async function getSecret(name: string) {
  const [v] = await client.accessSecretVersion({
    name: "projects/PROJECT/secrets/" + name + "/versions/latest",
  });
  return v.payload?.data?.toString();
}

// usage in RSC / Route Handler
// const dbUrl = await getSecret("DATABASE_URL");
`}
          />
          <CodeBlock
            lang="bash"
            code={`
# Create + grant + wire to Run (one-time)
echo -n "postgres://..." | gcloud secrets create DATABASE_URL --data-file=-
gcloud secrets add-iam-policy-binding DATABASE_URL \\
  --member=serviceAccount:run-sa@PROJECT.iam.gserviceaccount.com \\
  --role=roles/secretmanager.secretAccessor

gcloud run deploy interview-lab \\
  --source . \\
  --service-account run-sa@PROJECT.iam.gserviceaccount.com \\
  --set-secrets DATABASE_URL=DATABASE_URL:latest
`}
          />
          <Callout title="Interviewer expects">
            Secrets server-only, least-privilege IAM per secret, rotation via versions, no JSON keys on Run (use
            attached SA). Local <code>.env.local</code> is gitignored stand-in for Secret Manager.
          </Callout>
        </>
      }
      interview={
        <Callout title="Mistakes to avoid">
          Don’t prefix secrets with NEXT_PUBLIC_. Don’t commit <code>.env.local</code> or service-account JSON. Don’t
          grant secretAccessor at project level.
        </Callout>
      }
    />
  );
}
