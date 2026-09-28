import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getOrder } from "@/lib/orders";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  const order = getOrder(decodeURIComponent(id), userId ?? "guest");
  if (!order) notFound();
  return (
    <div className="space-y-4">
      <Link href="/orders" className="text-sm text-zinc-500 underline">
        ← Back to orders
      </Link>
      <h1 className="text-2xl font-bold">{order.shopName}</h1>
      <p className="text-sm text-zinc-500">{order.createdAt}</p>
      <ul className="divide-y rounded border">
        {order.items.map((it) => (
          <li key={it.productId} className="flex justify-between p-3">
            <span>
              {it.name} × {it.qty}
            </span>
            <span>¥{(it.priceYen * it.qty).toLocaleString()}</span>
          </li>
        ))}
      </ul>
      <p className="text-lg font-bold">Total: ¥{order.totalYen.toLocaleString()}</p>
    </div>
  );
}
