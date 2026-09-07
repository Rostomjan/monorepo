"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createMemo } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
    >
      {pending ? "Saving…" : "Add memo"}
    </button>
  );
}

export function MemoForm() {
  const [state, action] = useActionState(createMemo, null);

  return (
    <form action={action} className="space-y-3">
      <div className="flex gap-2">
        <input
          name="text"
          placeholder="Write a memo (max 80 chars)"
          className="flex-1 rounded-md border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          maxLength={80}
        />
        <Submit />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <p className="text-xs text-zinc-500">
        Uses Server Action + useActionState + useFormStatus. No API route — progressive enhancement works with JS
        disabled.
      </p>
    </form>
  );
}
