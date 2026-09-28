import { auth } from "@clerk/nextjs/server";
import { listOrders } from "@/lib/orders";

export async function GET() {
  const { userId } = await auth();
  return Response.json({ orders: listOrders(userId ?? "guest") });
}
