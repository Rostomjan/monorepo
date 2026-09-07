"use server";

import { revalidatePath } from "next/cache";

let memos: { id: number; text: string }[] = [{ id: 1, text: "Hello from server" }];

export async function getMemos() {
  return memos;
}

export async function createMemo(prev: { error?: string } | null, formData: FormData) {
  const text = String(formData.get("text") || "").trim();
  if (!text) return { error: "Text is required" };
  if (text.length > 80) return { error: "Max 80 chars" };
  const id = Date.now();
  memos = [{ id, text }, ...memos].slice(0, 10);
  revalidatePath("/server-actions");
  return { error: undefined as string | undefined, ok: true as const };
}

export async function clearMemos() {
  memos = [];
  revalidatePath("/server-actions");
}
