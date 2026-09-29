"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { checkoutAction } from "@/lib/cart-actions";

function CheckoutButton({ totalLabel }: { totalLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-on-brand shadow-md hover:bg-brand-deep disabled:opacity-50"
    >
      {pending ? "Checking out…" : `Checkout · ${totalLabel}`}
    </button>
  );
}

// Small client island: surfaces server-side checkout errors (e.g. stock
// conflicts) with useActionState. Everything else on the cart page is a
// plain action form, so it works with JavaScript disabled too.
export function CheckoutForm({ totalLabel }: { totalLabel: string }) {
  const [state, formAction] = useActionState(checkoutAction, null);
  return (
    <div className="space-y-2">
      {state?.error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <form action={formAction}>
        <CheckoutButton totalLabel={totalLabel} />
      </form>
    </div>
  );
}
