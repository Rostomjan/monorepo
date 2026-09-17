"use server";

import { Storage } from "@google-cloud/storage";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_NAME_LEN = 80;

function sanitize(filename: string) {
  return filename
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .slice(0, MAX_NAME_LEN);
}

export async function getStorageStatus() {
  const bucket = process.env.GCS_BUCKET?.trim();
  const projectId = process.env.GOOGLE_CLOUD_PROJECT?.trim();
  if (!bucket) {
    return {
      mode: "local" as const,
      reason: "GCS_BUCKET not set — local demo shape, zero cost, zero creds.",
    };
  }
  return { mode: "live" as const, bucket, projectId };
}

export async function mintUploadUrl(input: { filename: string; contentType: string }) {
  const bucketName = process.env.GCS_BUCKET?.trim();
  const filename = sanitize(input.filename || "demo.png");
  const contentType = input.contentType;

  if (!ALLOWED_TYPES.has(contentType)) {
    return { ok: false as const, error: "Only image/png, image/jpeg, image/webp for practice." };
  }

  // Local fallback — no bucket, no creds, no cost.
  if (!bucketName) {
    const fake = `https://storage.googleapis.com/demo-bucket/avatars/${filename}?X-Goog-Algorithm=FAKE&expires=900`;
    return {
      ok: true as const,
      mode: "local" as const,
      url: fake,
      objectName: `avatars/${filename}`,
      note: "Local shape only — set GCS_BUCKET + ADC to mint a real v4 URL.",
    };
  }

  try {
    const storage = new Storage();
    const objectName = `avatars/${Date.now()}-${filename}`;
    const [url] = await storage
      .bucket(bucketName)
      .file(objectName)
      .getSignedUrl({
        version: "v4",
        action: "write",
        expires: Date.now() + 10 * 60 * 1000,
        contentType,
      });

    return { ok: true as const, mode: "live" as const, url, objectName, note: "Real v4 URL, 10 min." };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown storage error";
    const hint = msg.includes("client_email")
      ? " User ADC can't sign v4 URLs (needs a service account; org blocks SA keys). Use 'Test live write' below for the live proof, or impersonate lab-signer."
      : msg.includes("Could not load the default credentials")
        ? " No ADC on this host — expected on Vercel. Mint works where ADC exists: local dev (impersonated login) or Cloud Run (attached SA)."
        : " Check ADC: gcloud auth application-default login, bucket + IAM.";
    return { ok: false as const, error: `Live mint failed (${msg}).${hint}` };
  }
}

export async function probeLiveWrite() {
  const bucketName = process.env.GCS_BUCKET?.trim();
  if (!bucketName) return { ok: false as const, error: "GCS_BUCKET not set." };
  try {
    const storage = new Storage();
    const name = `avatars/_probe-${Date.now()}.txt`;
    const file = storage.bucket(bucketName).file(name);
    await file.save("practice-only", { contentType: "text/plain" });
    await file.delete();
    return { ok: true as const, message: `Live write+delete OK on gs://${bucketName} (zero bytes retained).` };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Probe failed" };
  }
}
