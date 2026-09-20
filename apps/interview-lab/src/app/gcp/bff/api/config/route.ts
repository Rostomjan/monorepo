import { NextResponse } from "next/server";
import { Firestore } from "@google-cloud/firestore";

function projectId() {
  return process.env.GOOGLE_CLOUD_PROJECT?.trim() || "project-734f5ad8-8534-4188-a0a";
}

// BFF example 3: public-safe config assembled server-side. Secrets never
// leave the server — the UI gets only what it may render.
export async function GET() {
  const warnings: string[] = [];
  const flags: Record<string, boolean> = { upload: true, firestoreLive: true };
  try {
    const doc = await new Firestore({ projectId: projectId() }).collection("config").doc("public").get();
    if (doc.exists) Object.assign(flags, doc.data()?.flags ?? {});
  } catch (e) {
    warnings.push(`flags store unreachable, using defaults: ${e instanceof Error ? e.message : "unknown"}`);
  }

  return NextResponse.json({
    data: {
      bucket: process.env.GCS_BUCKET?.trim() ?? null,
      projectId: projectId(),
      region: "europe-west1",
      flags,
    },
    warnings,
  });
}
