"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { addToCart } from "@/lib/cart-actions";

// Compact card CTA. Mutates the server-side cart via Server Action (the
// layout badge revalidates automatically), then jumps to the cart.
export function QuickAdd({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await addToCart(productId, 1);
          router.push("/cart");
        });
      }}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-strip px-4 py-2 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-filter-active disabled:opacity-50"
    >
      <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden className="fill-current">
        <path
          d="M1.5 2.5h2l2.4 8.2a1 1 0 0 0 1 .8h6.9a1 1 0 0 0 1-.8L16.5 6.5H5.6"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="6.5" cy="13.5" r="1.2" />
        <circle cx="13.5" cy="13.5" r="1.2" />
      </svg>
      {pending ? "Adding…" : "Add to Cart"}
    </button>
  );
}
