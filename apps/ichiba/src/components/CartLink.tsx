"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cartCount, loadCart } from "@/lib/cart";

export function CartLink() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(cartCount(loadCart()));
    const onStorage = () => setCount(cartCount(loadCart()));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return <Link href="/cart">Cart ({count})</Link>;
}
