import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/AddToCart";
import { StockBadge } from "@repo/ui";
import { getProduct, getShop } from "@/lib/catalog";

// Vercel Full Route Cache replaces nginx product-page caching: entity
// staleness matches the 5-min unstable_cache TTL in catalog.ts.
export const revalidate = 300;

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(decodeURIComponent(id));
  if (!product) notFound();
  const shop = await getShop(product.shopId);

  return (
    <div className="space-y-4 py-6">
      <p className="text-[11px] font-bold tracking-wider text-muted">
        <Link href="/" className="hover:text-ink">MARKETPLACE</Link>
        <span aria-hidden> / </span>
        <span className="text-ink">{shop?.name.toUpperCase() ?? "PRODUCT"}</span>
      </p>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl bg-strip p-6 shadow-sm">
          <div className="aspect-[4/3] w-full" aria-hidden />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{shop?.name}</p>
          <h1 className="mt-1 text-3xl font-bold text-ink">{product.name}</h1>
          <p className="mt-2 text-2xl font-bold text-ink">¥{product.priceYen.toLocaleString()}</p>
          <div className="mt-2">
            <StockBadge
              text={product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
              tone={product.stock <= 0 ? "out" : product.stock <= 5 ? "low" : "ok"}
            />
          </div>
          <div className="mt-4">
            <AddToCart productId={product.id} />
          </div>
        </div>
      </div>
      <Link href="/" className="inline-block text-sm font-semibold text-muted underline hover:text-ink">
        ← Back to products
      </Link>
    </div>
  );
}
