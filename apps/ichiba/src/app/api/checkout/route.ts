import { getProduct } from "@/lib/catalog";
import { placeOrders, splitCartToOrders } from "@/lib/orders";

export async function POST(req: Request) {
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
    const product = getProduct(l.productId);
    if (!product) return Response.json({ error: `unknown product: ${l.productId}` }, { status: 400 });
    if (!Number.isInteger(l.qty) || l.qty < 1 || l.qty > 99) {
      return Response.json({ error: `bad qty for ${l.productId}` }, { status: 400 });
    }
    if (l.qty > product.stock) {
      return Response.json({ error: `insufficient stock for ${l.productId}` }, { status: 409 });
    }
    clean.push({ productId: l.productId, qty: l.qty });
  }
  // Mock payment: always succeeds. Stock decrement is in-memory (single instance).
  const orders = splitCartToOrders(clean);
  placeOrders(orders);
  return Response.json({ orderIds: orders.map((o) => o.id), orders });
}
