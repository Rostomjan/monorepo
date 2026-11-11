/**
 * Which implementation serves ichiba's catalog reads ("who computes it",
 * not "what data": every backend reads the same Postgres through
 * parity-locked semantics — see docs/BACKEND_TWINS.md).
 *
 * The decision has two independent gates, and BOTH must pass for a remote
 * backend to win:
 * 1. its flag (Vercel Flags) evaluates true for this request,
 * 2. its base-url env points at a running service.
 *
 * This is fail-safe by design: a flag alone must never route requests at a
 * service that is not configured, and a missing adapter (local dev, plain
 * `bun run dev`, tests) never leaves the canonical path.
 *
 * PLUG-IN RULE (docs/BACKEND_TWINS.md): the registry below is the ONLY
 * place a new backend twin needs touching in apps/ichiba. Add an entry to
 * REMOTE_BACKENDS (id + env name, in priority order), a flag declaration
 * in flags.ts, and an evaluator entry in flags-runtime.ts — the dispatch
 * sites in catalog.ts pick it up with no further edits.
 */
export type RemoteBackendId = "python" | "go";
export type CatalogBackend = "ts" | RemoteBackendId;

/**
 * Remote twins in priority order: the first whose two gates both pass wins
 * ("ts" is the implicit fallback and never listed). Priority order is a
 * product decision, not a technical one — with several flags enabled at
 * once, the earliest entry is who computes the page.
 */
const REMOTE_BACKENDS: readonly { id: RemoteBackendId; env: string }[] = [
  { id: "python", env: "ICHIBA_API_URL" },
  { id: "go", env: "ICHIBA_GO_API_URL" },
];

/** Base URL of a remote twin's service, trailing slashes stripped. */
export function backendBaseUrl(id: RemoteBackendId): string | undefined {
  const env = REMOTE_BACKENDS.find((b) => b.id === id)?.env;
  if (!env) throw new Error(`unknown remote backend: ${id}`);
  const raw = process.env[env]?.trim();
  return raw ? raw.replace(/\/+$/, "") : undefined;
}

export interface RemoteBackendGate {
  id: RemoteBackendId;
  flagEnabled: boolean;
  baseUrl?: string;
}

/** Pure backend decision — a flag alone is never enough. */
export function resolveCatalogBackend(gates: RemoteBackendGate[]): CatalogBackend {
  const usable = gates.find((gate) => gate.flagEnabled && gate.baseUrl !== undefined);
  return usable?.id ?? "ts";
}

/**
 * Resolves the effective backend for this request. The adapter import is
 * dynamic so pure importers (unit tests, contract fixtures) never load
 * flags/next or the Vercel adapter's request-context machinery. A backend
 * whose flag fails to evaluate stays out of the race (canonical fallback).
 */
export async function currentCatalogBackend(): Promise<CatalogBackend> {
  const { backendFlagEnabled } = await import("./flags-runtime");
  const gates: RemoteBackendGate[] = [];
  for (const { id, env } of REMOTE_BACKENDS) {
    let flagEnabled = false;
    try {
      flagEnabled = await backendFlagEnabled(id);
    } catch (err) {
      console.error(`${env} backend flag failed to evaluate; using canonical backend`, err);
    }
    gates.push({ id, flagEnabled, baseUrl: backendBaseUrl(id) });
  }
  return resolveCatalogBackend(gates);
}
