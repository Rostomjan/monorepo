"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function inviteMember(email: string) {
  const { orgId } = await auth();
  if (!orgId) return { message: "No org — create/join one at /clerk/organizations first." };
  if (!email || !email.includes("@")) return { message: "Enter a valid email." };
  try {
    const client = await clerkClient();
    await client.organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress: email.trim(),
      role: "org:member",
    });
    revalidatePath("/clerk/user-lifecycle");
    return { message: `Invitation sent to ${email} (role org:member)` };
  } catch (e: any) {
    return { message: e?.errors?.[0]?.message ?? e?.message ?? "Failed to invite" };
  }
}

export async function suspendSelf() {
  const { userId } = await auth();
  if (!userId) return { message: "Not signed in" };
  try {
    const client = await clerkClient();
    await client.users.banUser(userId);
    return { message: "Banned self — sign out and try to sign in → blocked. Use Unban to restore." };
  } catch (e: any) {
    return { message: e?.errors?.[0]?.message ?? e?.message ?? "Failed to ban" };
  }
}

export async function restoreSelf() {
  const { userId } = await auth();
  // If banned, auth().userId may be null & this will fail — use dashboard to unban in that case
  if (!userId) return { message: "Not signed in (banned users have no session) — unban via Dashboard → Users → select user → Unban." };
  try {
    const client = await clerkClient();
    await client.users.unbanUser(userId);
    return { message: "Unbanned — session valid again." };
  } catch (e: any) {
    return { message: e?.errors?.[0]?.message ?? e?.message ?? "Failed to unban (try dashboard)" };
  }
}
