"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { addLine, loadCart, saveCart } from "@/lib/cart";

export function AddToCart({ productId }: { productId: string }) {
  const router = useRouter();
  const { user } = useUser();
  const ownerId = user?.id ?? "guest";
  const [qty, setQtyState] = useState(1);
  return (
    <div className="flex items-center gap-2">
      <input
        aria-label="Quantity"
        type="number"
        min={1}
        max={99}
        value={qty}
        onChange={(e) => setQtyState(Math.min(99, Math.max(1, Number(e.target.value) || 1)))}
        className="w-16 rounded border border-zinc-300 px-2 py-1"
      />
      <button
        className="rounded bg-ichiba text-white px-4 py-2 hover:opacity-90"
        onClick={() => {
          saveCart(addLine(loadCart(ownerId), productId, qty), ownerId);
          router.push("/cart");
        }}
      >
        Add to Cart
      </button>
    </div>
  );
}
