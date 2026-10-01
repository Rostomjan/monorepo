import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { mergeCarts, parseCart, type Cart } from "./cart";
import { getProducts } from "./catalog";

// Server-only cart persistence (cookie-backed).
// Stage 2 semantics preserved: signed-out visitors share the "guest" cart,
// signed-in users get one cart each (cookie name is owner-scoped).
//
// Cookie discipline (Next.js forbids mutating cookies during render):
// - readCart() never writes — it returns a merged *view* for signed-in
//   users with a leftover guest cart.
// - Consolidation (fold + delete guest cookie) happens only in writeCart(),
//   which runs exclusively inside Server Actions, where mutation is allowed.

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

function cookieOpts() {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export async function readCart(): Promise<Cart> {
  const jar = await cookies();
  const owner = await cartOwner();
  const user = parseCookie(jar.get(cookieName(owner))?.value);
  if (owner === "guest") return user;
  const guest = parseCookie(jar.get(cookieName("guest"))?.value);
  if (guest.length === 0) return user;
  // Transient post-login state: show the union, dropping stale product ids
  // so phantom lines never inflate the badge. Persisted on the next write.
  const validIds = new Set((await getProducts([...user, ...guest].map((l) => l.productId))).keys());
  return mergeCarts(
    user.filter((l) => validIds.has(l.productId)),
    guest.filter((l) => validIds.has(l.productId)),
  );
}

export async function writeCart(cart: Cart): Promise<void> {
  const jar = await cookies();
  const owner = await cartOwner();
  jar.set(cookieName(owner), JSON.stringify(cart), cookieOpts());
  if (owner !== "guest") jar.delete(cookieName("guest"));
}
