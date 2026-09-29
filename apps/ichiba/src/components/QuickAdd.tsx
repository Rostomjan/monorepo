"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { addLine, loadCart, saveCart } from "@/lib/cart";

// Compact card CTA: adds one unit and jumps to the cart.
// Presentational slot for `ProductCard action` — cart logic lives here in the app.
export function QuickAdd({ productId }: { productId: string }) {
  const router = useRouter();
  const { user } = useUser();
  const ownerId = user?.id ?? "guest";
  return (
    <button
      type="button"
      onClick={() => {
        saveCart(addLine(loadCart(ownerId), productId, 1), ownerId);
        router.push("/cart");
      }}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-strip px-4 py-2 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-filter-active"
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
      Add to Cart
    </button>
  );
}
