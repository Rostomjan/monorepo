import { CartView } from "@/components/CartView";

export default function CartPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Cart</h1>
      <p className="text-sm text-zinc-500">Mixed shops OK — checkout splits into one order per shop.</p>
      <CartView />
    </div>
  );
}
