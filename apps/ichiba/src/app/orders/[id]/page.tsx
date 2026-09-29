import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getOrder } from "@/lib/orders";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  const order = await getOrder(decodeURIComponent(id), userId ?? "guest");
  if (!order) notFound();
  return (
    <div className="space-y-4 py-6">
      <Link href="/orders" className="text-sm font-semibold text-muted underline hover:text-ink">
        ← Back to orders
      </Link>
      <h1 className="text-[28px] font-bold text-ink">{order.shopName}</h1>
      <p className="text-sm text-muted">{order.createdAt}</p>
      <ul className="divide-y divide-strip rounded-xl bg-white shadow-sm">
        {order.items.map((it) => (
          <li key={it.productId} className="flex justify-between p-4">
            <span className="text-ink">
              {it.name} × {it.qty}
            </span>
            <span className="font-semibold text-ink">¥{(it.priceYen * it.qty).toLocaleString()}</span>
          </li>
        ))}
      </ul>
      <p className="text-lg font-bold text-ink">Total: ¥{order.totalYen.toLocaleString()}</p>
    </div>
  );
}
