import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { listOrders } from "@/lib/orders";

export default async function OrdersPage() {
  const { userId } = await auth();
  const orders = listOrders(userId ?? "guest");
  return (
    <div className="space-y-4 py-6">
      <p className="text-[11px] font-bold tracking-wider text-muted">
        <Link href="/" className="hover:text-ink">MARKETPLACE</Link>
        <span aria-hidden> / </span>
        <span className="text-ink">ORDERS</span>
      </p>
      <h1 className="text-[28px] font-bold text-ink">Orders</h1>
      {orders.length === 0 && (
        <p className="rounded-xl bg-white p-8 text-center text-muted shadow-sm">
          No orders yet — add something to the cart.
        </p>
      )}
      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.id} className="rounded-xl bg-white p-4 shadow-sm">
            <Link href={`/orders/${encodeURIComponent(o.id)}`} className="font-semibold text-ink hover:underline">
              {o.shopName}
            </Link>
            <p className="text-sm text-muted">
              {o.items.length} items · ¥{o.totalYen.toLocaleString()} · {o.createdAt}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
