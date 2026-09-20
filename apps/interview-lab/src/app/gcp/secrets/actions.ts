"use server";

import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const PRACTICE_SECRET = "LAB_PRACTICE_SECRET";

function projectId() {
  return process.env.GOOGLE_CLOUD_PROJECT?.trim() || "project-734f5ad8-8534-4188-a0a";
}

function mask(value: string) {
  if (value.length <= 4) return "***";
  return value.slice(0, 2) + "***" + value.slice(-1);
}

export async function readPracticeSecret() {
  try {
    const client = new SecretManagerServiceClient();
    const name = `projects/${projectId()}/secrets/${PRACTICE_SECRET}/versions/latest`;
    const [v] = await client.accessSecretVersion({ name });
    const raw = v.payload?.data?.toString() ?? "";
    return {
      ok: true as const,
      masked: mask(raw),
      length: raw.length,
      note: "Live read server-only. UI shows masked preview — full value never leaves the server.",
    };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Secret read failed" };
  }
}
