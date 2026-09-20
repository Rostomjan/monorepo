import { NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";
import { Firestore } from "@google-cloud/firestore";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

function projectId() {
  return process.env.GOOGLE_CLOUD_PROJECT?.trim() || "project-734f5ad8-8534-4188-a0a";
}

// BFF example 1: one frontend-shaped JSON aggregating three GCP backends.
// Degrades per-backend (warnings[]) instead of 500ing — that IS the pattern.
export async function GET() {
  const warnings: string[] = [];
  const pid = projectId();
  const bucketName = process.env.GCS_BUCKET?.trim();

  const storage: Record<string, unknown> = { configured: !!bucketName, bucket: bucketName ?? null };
  if (bucketName) {
    try {
      const [meta] = await new Storage().bucket(bucketName).getMetadata();
      storage.location = meta.location;
      storage.storageClass = meta.storageClass;
    } catch (e) {
      storage.reachable = false;
      warnings.push(`storage: ${e instanceof Error ? e.message : "unreachable"}`);
    }
  }

  const database: Record<string, unknown> = { collection: "lab_probes" };
  try {
    const snap = await new Firestore({ projectId: pid }).collection("lab_probes").limit(1).get();
    database.reachable = true;
    database.sampleDocs = snap.size;
  } catch (e) {
    database.reachable = false;
    warnings.push(`firestore: ${e instanceof Error ? e.message : "unreachable"}`);
  }

  const secrets: Record<string, unknown> = { secret: "LAB_PRACTICE_SECRET" };
  try {
    const client = new SecretManagerServiceClient();
    const [v] = await client.accessSecretVersion({
      name: `projects/${pid}/secrets/LAB_PRACTICE_SECRET/versions/latest`,
    });
    secrets.latestVersion = v.name?.split("/").pop();
    secrets.payloadLength = v.payload?.data?.length ?? 0;
  } catch (e) {
    secrets.reachable = false;
    warnings.push(`secrets: ${e instanceof Error ? e.message : "unreachable"}`);
  }

  return NextResponse.json({ data: { storage, database, secrets }, warnings });
}
