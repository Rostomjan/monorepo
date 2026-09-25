import { listOrders } from "@/lib/orders";

export function GET() {
  return Response.json({ orders: listOrders() });
}
