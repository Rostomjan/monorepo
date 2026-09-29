"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProduct } from "./catalog";
import { addLine, removeLine, setQty } from "./cart";
import { cartOwner, readCart, writeCart } from "./cart-store";
import { placeOrders, splitCartToOrders } from "./orders";

function refreshCartUI(): void {
  // Layout-scoped revalidation refreshes the server-rendered header badge
  // plus every page below it — no client event bus needed.
  revalidatePath("/", "layout");
}

function cleanQty(qty: unknown, fallback = 1): number {
  const n = typeof qty === "string" ? Number(qty) : typeof qty === "number" ? qty : NaN;
  if (!Number.isInteger(n)) return fallback;
  return Math.min(99, Math.max(0, n));
}

export async function addToCart(productId: string, qty: unknown = 1): Promise<void> {
  const product = getProduct(productId);
  if (!product) throw new Error(`unknown product: ${productId}`);
  const n = cleanQty(qty);
  if (n < 1) throw new Error(`bad qty for ${productId}`);
  await writeCart(addLine(await readCart(), productId, Math.min(n, product.stock)));
  refreshCartUI();
}

export async function setLineQty(productId: string, qty: unknown): Promise<void> {
  const n = cleanQty(qty, 0);
  await writeCart(setQty(await readCart(), productId, n));
  refreshCartUI();
}

export async function removeFromCart(productId: string): Promise<void> {
  await writeCart(removeLine(await readCart(), productId));
  refreshCartUI();
}

// Checkout reads the server-side cart (never trusts client-submitted items).
// Mock payment always succeeds; over-claimed stock fails the whole checkout.
export async function checkoutAction(): Promise<{ error: string } | never> {
  const cart = await readCart();
  if (cart.length === 0) return { error: "Your cart is empty." };
  for (const line of cart) {
    const product = getProduct(line.productId);
    if (!product) return { error: `Unknown product: ${line.productId}.` };
    if (line.qty > product.stock) return { error: `Insufficient stock for ${product.name}.` };
  }
  placeOrders(splitCartToOrders(cart, await cartOwner()));
  await writeCart([]);
  refreshCartUI();
  redirect("/orders");
}
