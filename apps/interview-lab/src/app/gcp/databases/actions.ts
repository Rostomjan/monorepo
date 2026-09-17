"use server";

import { Firestore } from "@google-cloud/firestore";

function projectId() {
  return process.env.GOOGLE_CLOUD_PROJECT?.trim() || "project-734f5ad8-8534-4188-a0a";
}

export async function probeFirestore() {
  try {
    const db = new Firestore({ projectId: projectId() });
    const ref = db.collection("lab_probes").doc(`probe-${Date.now()}`);
    await ref.set({ at: new Date().toISOString(), note: "practice-only" });
    const snap = await ref.get();
    const exists = snap.exists;
    await ref.delete();
    return {
      ok: true as const,
      message: `Live Firestore round-trip OK (write+read+delete, exists=${exists}, zero docs retained).`,
    };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Firestore probe failed" };
  }
}
