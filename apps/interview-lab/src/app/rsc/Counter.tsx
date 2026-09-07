"use client";

import { useState } from "react";

export function Counter() {
  const [n, setN] = useState(0);
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => setN((v) => v - 1)} className="rounded-md border px-3 py-1 text-sm hover:bg-zinc-50">
        −
      </button>
      <span className="w-10 text-center font-mono text-sm">{n}</span>
      <button onClick={() => setN((v) => v + 1)} className="rounded-md bg-zinc-900 px-3 py-1 text-sm text-white">
        +
      </button>
      <span className="ml-2 text-xs text-zinc-500">client state</span>
    </div>
  );
}
