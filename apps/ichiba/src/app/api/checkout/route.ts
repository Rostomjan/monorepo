import { auth } from "@clerk/nextjs/server";
import { checkoutCart } from "@/lib/orders";
import { checkWriteRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  // Cloud replacement for nginx `limit_req zone=write_zone`: 429 when over
  // budget. No-op locally (no Upstash env) so dev/CI stay green.
  if (!(await checkWriteRateLimit(req))) {
    return Response.json({ error: "too many requests" }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const lines = (body as { items?: Array<{ productId?: unknown; qty?: unknown }> }).items;
  if (!Array.isArray(lines) || lines.length === 0 || lines.length > 50) {
    return Response.json({ error: "items must be a non-empty array (max 50)" }, { status: 400 });
  }
  const clean: Array<{ productId: string; qty: number }> = [];
  for (const l of lines) {
    if (typeof l.productId !== "string" || typeof l.qty !== "number") {
      return Response.json({ error: "each item needs productId:string, qty:number" }, { status: 400 });
    }
    clean.push({ productId: l.productId, qty: l.qty });
  }
  // Mock payment: always succeeds. Stock decrement is atomic (single
  // transaction). Orders are attributed to the signed-in user, or "guest".
  const { userId } = await auth();
  try {
    const orders = await checkoutCart(clean, userId ?? "guest");
    return Response.json({ orderIds: orders.map((o) => o.id), orders });
  } catch (e) {
    const message = e instanceof Error ? e.message : "checkout failed";
    const status = message.startsWith("insufficient stock") ? 409 : 400;
    return Response.json({ error: message }, { status });
  }
}
