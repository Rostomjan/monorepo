"use client";

import { useState } from "react";

export function EchoClient() {
  const [val, setVal] = useState("hello");
  const [res, setRes] = useState<string>("");

  async function post() {
    const r = await fetch("/route-handlers/api/echo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ echo: val }),
    });
    setRes(JSON.stringify(await r.json(), null, 2));
  }
  async function get() {
    const r = await fetch("/route-handlers/api/echo");
    setRes(JSON.stringify(await r.json(), null, 2));
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="flex-1 rounded-md border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button onClick={post} className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white">
          POST
        </button>
        <button onClick={get} className="rounded-md border px-3 py-2 text-sm">
          GET
        </button>
      </div>
      {res && <pre className="overflow-x-auto rounded bg-zinc-950 p-3 text-xs text-zinc-100">{res}</pre>}
    </div>
  );
}
