import Link from "next/link";
import { getShop, listProducts, searchProducts } from "@/lib/catalog";

interface SearchParams {
  q?: string;
  page?: string;
}

export default async function Page({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const sp = (await searchParams) ?? {};
  const q = sp.q ?? "";
  const page = Number(sp.page ?? "1") || 1;

  const searching = q.trim().length > 0;
  const items = searching ? searchProducts(q, 60) : listProducts(page, 20).items;
  const { total, totalPages } = listProducts(page, 20);

  return (
    <div className="space-y-6">
      <form method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search products… (try 'Matcha')"
          className="w-full rounded border border-zinc-300 px-3 py-2"
        />
        <button className="rounded bg-ichiba px-4 py-2 text-white hover:opacity-90">Search</button>
      </form>

      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">{searching ? `Results for “${q}”` : "All products"}</h1>
        {!searching && (
          <p className="text-sm text-zinc-500">
            Page {page} of {totalPages} · {total} products
          </p>
        )}
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((p) => (
          <li key={p.id} className="rounded-[var(--radius-card)] border p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">{getShop(p.shopId)?.name}</p>
            <Link href={`/products/${p.id}`} className="mt-1 block font-medium hover:underline">
              {p.name}
            </Link>
            <p className="mt-2 font-bold">¥{p.priceYen.toLocaleString()}</p>
            <p className="text-sm text-zinc-500">{p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}</p>
          </li>
        ))}
      </ul>

      {items.length === 0 && <p className="text-zinc-600">No products found.</p>}

      {!searching && (
        <div className="flex justify-between text-sm">
          <Link href={`/?page=${Math.max(1, page - 1)}`} aria-disabled={page <= 1}>
            ← Prev
          </Link>
          <Link href={`/?page=${Math.min(totalPages, page + 1)}`} aria-disabled={page >= totalPages}>
            Next →
          </Link>
        </div>
      )}
    </div>
  );
}
