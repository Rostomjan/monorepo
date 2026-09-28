import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { listOrders } from "@/lib/orders";

export default async function OrdersPage() {
  const { userId } = await auth();
  const orders = listOrders(userId ?? "guest");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Orders</h1>
      {orders.length === 0 && <p className="text-zinc-600">No orders yet — add something to the cart.</p>}
      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.id} className="rounded border p-3">
            <Link href={`/orders/${encodeURIComponent(o.id)}`} className="font-medium hover:underline">
              {o.shopName}
            </Link>
            <p className="text-sm text-zinc-500">
              {o.items.length} items · ¥{o.totalYen.toLocaleString()} · {o.createdAt}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
