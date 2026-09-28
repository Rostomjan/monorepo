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
  return <Link href="/cart">Cart ({count})</Link>;
}
