import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/AddToCart";
import { getProduct, getShop } from "@/lib/catalog";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProduct(decodeURIComponent(id));
  if (!product) notFound();
  const shop = getShop(product.shopId);

  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm text-zinc-500 underline">
        ← Back to products
      </Link>
      <p className="text-sm uppercase tracking-wide text-zinc-500">{shop?.name}</p>
      <h1 className="text-3xl font-bold">{product.name}</h1>
      <p className="text-2xl font-bold">¥{product.priceYen.toLocaleString()}</p>
      <p className="text-sm text-zinc-500">{product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</p>
      <AddToCart productId={product.id} />
    </div>
  );
}
