import { Callout, CodeBlock, DemoCard } from "../../components/CodeBlock";
import { DemoShell } from "../../components/DemoShell";
import { UploadDemo } from "./UploadDemo";
import { getStorageStatus } from "./actions";

export const metadata = { title: "Cloud Storage (GCS)" };

export default async function Page() {
  const status = await getStorageStatus();
  const mode = status.mode;

  return (
    <DemoShell
      title="Cloud Storage — presigned upload"
      intro="Browser uploads direct to GCS via a signed URL minted server-side. Key stays server-only; browser only sees a short-lived PUT URL. Without GCS_BUCKET you get a local shape (free); with bucket + ADC you mint real v4 URLs."
      demo={
        <>
          <DemoCard title={`Try it — ${mode === "live" ? "live bucket" : "local shape (free)"}`}>
            <UploadDemo initialMode={mode} />
            <p className="mt-2 text-xs text-zinc-500">
              Practice guardrails: images only, ≤ 1 MB PUT, 10-min expiry. Local mode performs no PUT (zero cost).
            </p>
          </DemoCard>
          <DemoCard title="Flow">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
              <li>Browser → Server Action: mint URL for filename + type</li>
              <li>Server mints v4 PUT URL (or local shape when no bucket)</li>
              <li>Browser PUTs bytes direct to storage.googleapis.com (live only)</li>
              <li>Server stores object name in DB (not the signed URL)</li>
            </ol>
          </DemoCard>
          <DemoCard title="Free-tier practice setup (one-time, ~5 min)">
            <ol className="list-decimal space-y-1 pl-5 text-xs text-zinc-600 dark:text-zinc-400">
              <li>
                Install CLI: <code>brew install google-cloud-sdk</code> then <code>gcloud auth login</code>
              </li>
              <li>
                <code>gcloud config set project project-734f5ad8-8534-4188-a0a</code> (confirm full ID in console —
                yours looked truncated)
              </li>
              <li>
                <code>gcloud services enable storage.googleapis.com</code>
              </li>
              <li>
                <code>
                  gcloud storage buckets create gs://YOUR_UNIQUE_BUCKET --location=europe-west1
                  --uniform-bucket-level-access
                </code>
              </li>
              <li>
                <code>gcloud auth application-default login</code> (local ADC — never commit JSON)
              </li>
              <li>
                <code>GCS_BUCKET=YOUR_UNIQUE_BUCKET</code> in <code>.env.local</code> (gitignored), restart dev
              </li>
            </ol>
            <p className="mt-2 text-xs text-zinc-500">
              Stays free: Standard regional, ≤ 5 GB, small test images, delete objects after practice (
              <code>gcloud storage rm -r gs://BUCKET/avatars/**</code>). No public IAM grant in this Demo.
            </p>
          </DemoCard>
        </>
      }
      code={
        <>
          <CodeBlock
            lang="tsx"
            code={`
// app/gcp/storage/actions.ts — live-safe, local fallback
"use server";
import { Storage } from "@google-cloud/storage";

export async function mintUploadUrl({ filename, contentType }: { filename: string; contentType: string }) {
  const bucketName = process.env.GCS_BUCKET?.trim();
  if (!bucketName) return { ok: true, mode: "local", url: "https://storage.googleapis.com/demo-bucket/..." };
  const storage = new Storage(); // ADC locally, workload identity on Run
  const objectName = "avatars/" + Date.now() + "-" + filename;
  const [url] = await storage.bucket(bucketName).file(objectName).getSignedUrl({
    version: "v4", action: "write", expires: Date.now() + 10*60*1000, contentType,
  });
  return { ok: true, mode: "live", url, objectName };
}
`}
          />
          <CodeBlock
            lang="bash"
            code={`
# .env.local (gitignored — never commit)
GCS_BUCKET=your-unique-bucket
GOOGLE_CLOUD_PROJECT=project-734f5ad8-8534-4188-a0a

# CORS for browser PUT (cors.json: origin = http://localhost:3003)
gcloud storage buckets update gs://YOUR_UNIQUE_BUCKET --cors-file=cors.json

# Cleanup after practice (stay free)
gcloud storage rm -r gs://YOUR_UNIQUE_BUCKET/avatars/**
`}
          />
          <Callout title="Interviewer expects">
            Signed URL = server mints, browser uploads direct. Never expose service-account JSON to client. Mention v4
            expiry, content-type lock, CORS, ADC vs workload identity, and storing object name in DB.
          </Callout>
        </>
      }
      interview={
        <Callout title="Mistakes to avoid">
          Don’t proxy large files through Next. Don’t make bucket world-writable. Don’t reuse URLs — mint per upload
          with short expiry. Don’t commit <code>.env.local</code> or JSON keys.
        </Callout>
      }
    />
  );
}
