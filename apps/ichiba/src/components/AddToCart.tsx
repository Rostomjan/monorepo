"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addToCart } from "@/lib/cart-actions";

export function AddToCart({ productId }: { productId: string }) {
  const router = useRouter();
  const [qty, setQtyState] = useState(1);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <input
        aria-label="Quantity"
        type="number"
        min={1}
        max={99}
        value={qty}
        onChange={(e) => setQtyState(Math.min(99, Math.max(1, Number(e.target.value) || 1)))}
        className="w-16 rounded-lg border border-strip bg-white px-2 py-1 shadow-sm outline-none"
      />
      <button
        disabled={pending}
        className="rounded-lg bg-brand text-white px-4 py-2 font-semibold hover:bg-brand-deep disabled:opacity-50"
        onClick={() => {
          startTransition(async () => {
            await addToCart(productId, qty);
            router.push("/cart");
          });
        }}
      >
        {pending ? "Adding…" : "Add to Cart"}
      </button>
    </div>
  );
}
