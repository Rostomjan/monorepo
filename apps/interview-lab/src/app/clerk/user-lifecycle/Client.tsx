"use client";

import { useState } from "react";
import { inviteMember, suspendSelf, restoreSelf } from "./actions";

export function InviteForm() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="alice@acme.com"
          className="flex-1 rounded-md border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          onClick={async () => {
            setMsg(null);
            const res = await inviteMember(email);
            setMsg(res.message);
          }}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white"
        >
          Invite
        </button>
      </div>
      {msg && <p className="text-xs text-zinc-600 dark:text-zinc-400">{msg}</p>}
      <p className="text-xs text-zinc-500">Free — uses <code>clerkClient.organizations.createOrganizationInvitation</code>.</p>
    </div>
  );
}

export function SuspendButtons() {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={async () => setMsg((await suspendSelf()).message)}
          className="rounded-md border px-3 py-2 text-sm dark:border-zinc-700"
        >
          Ban self (demo)
        </button>
        <button
          onClick={async () => setMsg((await restoreSelf()).message)}
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-white dark:text-zinc-900"
        >
          Unban self
        </button>
      </div>
      {msg && <p className="text-xs text-zinc-600 dark:text-zinc-400">{msg}</p>}
    </div>
  );
}
