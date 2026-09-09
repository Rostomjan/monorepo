"use client";

import { createContext, use, useState } from "react";

type Theme = { bg: string; fg: string; name: string };
const ThemeContext = createContext<Theme>({ bg: "#ffffff", fg: "#09090b", name: "light" });
const UserContext = createContext<{ name: string; plan: string } | null>(null);

function ThemedBox({ enabled }: { enabled: boolean }) {
  // Advanced: `use(context)` can be called conditionally — `useContext` cannot.
  // Interview trap: "Can you conditionally read context?" With `use`, yes.
  if (!enabled) {
    return <div className="rounded-md border border-dashed px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700">Context not read (enabled=false) — no Rules-of-Hooks violation</div>;
  }
  const theme = use(ThemeContext); // conditional!
  const user = use(UserContext); // also conditional, could be null
  return (
    <div className="rounded-md border px-3 py-2 text-sm dark:border-zinc-700" style={{ background: theme.bg, color: theme.fg, borderColor: theme.name === "dark" ? "#27272a" : "#e4e4e7" }}>
      Theme via <code>use(ThemeContext)</code>: {theme.name} · User via <code>use(UserContext)</code>: {user?.name ?? "—"} ({user?.plan})
    </div>
  );
}

function ClassicHookViolation() {
  // This would throw lint / break if you tried:
  // if (enabled) { const theme = useContext(ThemeContext) } // ❌ Cannot call conditionally
  return (
    <div className="rounded bg-zinc-950 p-2 text-[11px] leading-relaxed text-zinc-300">
      <span className="text-red-400">❌ useContext(ThemeContext)</span> inside <code>if</code> → violates Rules of Hooks.<br />
      <span className="text-emerald-400">✓ use(ThemeContext)</span> inside <code>if</code> → allowed (React 19).
    </div>
  );
}

export function ContextDemo() {
  const [enabled, setEnabled] = useState(true);
  const [themeName, setThemeName] = useState<"light" | "dark">("light");
  const theme: Theme = themeName === "light" ? { bg: "#ffffff", fg: "#09090b", name: "light" } : { bg: "#09090b", fg: "#fafafa", name: "dark" };

  return (
    <ThemeContext.Provider value={theme}>
      <UserContext.Provider value={{ name: "Ava", plan: "pro" }}>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setEnabled((v) => !v)} className="rounded-full border px-3 py-1 text-xs dark:border-zinc-700">
              {enabled ? "Disable" : "Enable"} conditional use(context)
            </button>
            <button onClick={() => setThemeName((t) => (t === "light" ? "dark" : "light"))} className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-white dark:bg-white dark:text-zinc-900">
              Toggle theme ({themeName})
            </button>
          </div>

          <ThemedBox enabled={enabled} />
          <ClassicHookViolation />

          <p className="text-[11px] leading-relaxed text-zinc-500">
            <code>use(context)</code> is the <em>only</em> hook-like API that can be called conditionally and inside loops. It reads the latest context value without subscribing in the hook order — perfect for feature flags, tenant theming, and A/B branches.
          </p>
        </div>
      </UserContext.Provider>
    </ThemeContext.Provider>
  );
}
