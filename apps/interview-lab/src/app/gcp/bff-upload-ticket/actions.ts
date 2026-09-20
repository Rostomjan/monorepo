"use server";

import { Storage } from "@google-cloud/storage";
import { Firestore } from "@google-cloud/firestore";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function projectId() {
  return process.env.GOOGLE_CLOUD_PROJECT?.trim() || "project-734f5ad8-8534-4188-a0a";
}

// BFF example 2: ONE call returns everything the upload screen needs —
// signed URL + pre-registered Firestore doc. Client just PUTs bytes.
export async function createUploadTicket(input: { filename: string; contentType: string }) {
  const bucketName = process.env.GCS_BUCKET?.trim();
  if (!bucketName) {
    return { ok: false as const, error: "GCS_BUCKET not set — ticket needs a live bucket." };
  }
  const filename = input.filename.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "-").slice(0, 80);
  if (!ALLOWED_TYPES.has(input.contentType)) {
    return { ok: false as const, error: "Only image/png, image/jpeg, image/webp for practice." };
  }

  try {
    const pid = projectId();
    const objectName = `avatars/${Date.now()}-${filename || "upload"}`;
    const storage = new Storage();
    const [url] = await storage.bucket(bucketName).file(objectName).getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 10 * 60 * 1000,
      contentType: input.contentType,
    });
    const doc = await new Firestore({ projectId: pid })
      .collection("uploads")
      .add({ objectName, contentType: input.contentType, status: "ticketed", createdAt: new Date().toISOString() });
    return { ok: true as const, url, objectName, docId: doc.id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Ticket failed" };
  }
}
