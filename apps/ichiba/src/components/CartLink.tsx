"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { cartCount, loadCart } from "@/lib/cart";

export function CartLink() {
  const { user } = useUser();
  const ownerId = user?.id ?? "guest";
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(cartCount(loadCart(ownerId)));
    const onStorage = () => setCount(cartCount(loadCart(ownerId)));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [ownerId]);
  return (
    <Link href="/cart" className="relative inline-flex items-center gap-1.5 hover:text-ink" aria-label={`Cart, ${count} items`}>
      <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden className="fill-current">
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
      <span className="hidden sm:inline">Cart</span>
      {count > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-on-brand">
          {count}
        </span>
      )}
    </Link>
  );
}
