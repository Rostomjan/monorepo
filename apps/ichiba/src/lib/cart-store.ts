import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { mergeCarts, parseCart, type Cart } from "./cart";
import { getProducts } from "./catalog";

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

function parseCookie(raw: string | undefined): Cart {
  if (!raw) return [];
  try {
    return parseCart(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function readCart(): Promise<Cart> {
  const jar = await cookies();
  return parseCookie(jar.get(cookieName(await cartOwner()))?.value);
}

export async function writeCart(cart: Cart): Promise<void> {
  const jar = await cookies();
  jar.set(cookieName(await cartOwner()), JSON.stringify(cart), cookieOpts());
}

function cookieOpts() {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

// One-time fold of the guest cart into the user cart at login. Runs on every
// request but only writes when a non-empty guest cart exists; stale product
// ids are dropped so junk never migrates into the user cart.
export async function mergeGuestCart(): Promise<void> {
  const owner = await cartOwner();
  if (owner === "guest") return;
  const jar = await cookies();
  const guest = parseCookie(jar.get(cookieName("guest"))?.value);
  if (guest.length === 0) return;
  const user = parseCookie(jar.get(cookieName(owner))?.value);
  const validIds = new Set((await getProducts([...user, ...guest].map((l) => l.productId))).keys());
  const merged = mergeCarts(
    user.filter((l) => validIds.has(l.productId)),
    guest.filter((l) => validIds.has(l.productId)),
  );
  jar.set(cookieName(owner), JSON.stringify(merged), cookieOpts());
  jar.delete(cookieName("guest"));
}
