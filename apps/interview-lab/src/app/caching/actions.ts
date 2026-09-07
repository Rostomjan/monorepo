"use server";

import { revalidatePath, updateTag } from "next/cache";

export async function revalidateDemoTag() {
  updateTag("demo-time");
}

export async function revalidateDemoPath() {
  revalidatePath("/caching");
}
