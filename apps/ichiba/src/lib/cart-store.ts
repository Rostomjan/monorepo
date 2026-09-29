import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { parseCart, type Cart } from "./cart";

// Server-only cart persistence (cookie-backed).
// Stage 2 semantics preserved: signed-out visitors share the "guest" cart,
// signed-in users get one cart each (cookie name is owner-scoped).

const COOKIE_PREFIX = "ichiba_cart_v1";

function cookieName(ownerId: string): string {
  const safe = ownerId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  return safe === "guest" ? COOKIE_PREFIX : `${COOKIE_PREFIX}__${safe}`;
}

export async function cartOwner(): Promise<string> {
  const { userId } = await auth();
  return userId ?? "guest";
}

export async function readCart(): Promise<Cart> {
  const jar = await cookies();
  const raw = jar.get(cookieName(await cartOwner()))?.value;
  if (!raw) return [];
  try {
    return parseCart(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function writeCart(cart: Cart): Promise<void> {
  const jar = await cookies();
  jar.set(cookieName(await cartOwner()), JSON.stringify(cart), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
