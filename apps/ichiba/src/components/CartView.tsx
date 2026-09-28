"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { clearCart, loadCart, removeLine, saveCart, setQty, type Cart } from "@/lib/cart";
import { getProduct } from "@/lib/catalog";

export function CartView() {
  const router = useRouter();
  const { user } = useUser();
  const ownerId = user?.id ?? "guest";
  const [cart, setCart] = useState<Cart>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCart(loadCart(ownerId));
  }, [ownerId]);

  const total = cart.reduce((n, l) => n + (getProduct(l.productId)?.priceYen ?? 0) * l.qty, 0);

  if (cart.length === 0) {
    return <p className="text-zinc-600">Your cart is empty.</p>;
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded border border-red-300 bg-red-50 p-2 text-red-700">{error}</p>}
      <ul className="divide-y rounded border">
        {cart.map((line) => {
          const p = getProduct(line.productId);
          if (!p) return null;
          return (
            <li key={line.productId} className="flex items-center justify-between gap-4 p-3">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-zinc-500">¥{p.priceYen.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  aria-label={`Quantity for ${p.name}`}
                  type="number"
                  min={0}
                  max={99}
                  value={line.qty}
                  onChange={(e) => {
                    const next = setQty(cart, line.productId, Number(e.target.value) || 0);
                    setCart(next);
                    saveCart(next, ownerId);
                  }}
                  className="w-16 rounded border border-zinc-300 px-2 py-1"
                />
                <button
                  className="text-sm text-zinc-500 underline"
                  onClick={() => {
                    const next = removeLine(cart, line.productId);
                    setCart(next);
                    saveCart(next, ownerId);
                  }}
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between">
        <p className="text-lg font-bold">Total: ¥{total.toLocaleString()}</p>
        <button
          disabled={busy}
          className="rounded bg-ichiba px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ items: cart }),
              });
              const json = (await res.json()) as { error?: string };
              if (!res.ok) throw new Error(json.error ?? "checkout failed");
              clearCart(ownerId);
              router.push("/orders");
            } catch (e) {
              setError(e instanceof Error ? e.message : "checkout failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Checking out…" : "Mock Checkout"}
        </button>
      </div>
    </div>
  );
}
