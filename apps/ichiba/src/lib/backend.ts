/**
 * Which implementation serves ichiba's catalog reads ("who computes it",
 * not "what data": both backends read the same Postgres through
 * parity-locked semantics — see docs/DUAL_BACKEND.md).
 *
 * The decision has two independent gates, and BOTH must pass:
 * 1. the `ichiba-python-backend` flag (Vercel Flags) evaluates true,
 * 2. ICHIBA_API_URL points at a running ichiba-py service.
 *
 * This is fail-safe by design: the flag alone must never route requests at
 * a service that is not configured, and a missing adapter (local dev,
 * plain `bun run dev`, tests) never leaves the canonical path.
 */
export type CatalogBackend = "ts" | "python";

/** Base URL of the ichiba-py service, trailing slashes stripped. */
export function pythonApiBaseUrl(): string | undefined {
  const raw = process.env.ICHIBA_API_URL?.trim();
  return raw ? raw.replace(/\/+$/, "") : undefined;
}

/** Pure backend decision — flag alone is not enough. */
export function resolveCatalogBackend(
  flagEnabled: boolean,
  baseUrl: string | undefined = pythonApiBaseUrl(),
): CatalogBackend {
  return flagEnabled && baseUrl !== undefined ? "python" : "ts";
}

/**
 * Resolves the effective backend for this request. The adapter import is
 * dynamic so pure importers (unit tests, contract fixtures) never load
 * flags/next or the Vercel adapter's request-context machinery.
 */
export async function currentCatalogBackend(): Promise<CatalogBackend> {
  let flagEnabled = false;
  try {
    const { pythonBackendEnabled } = await import("./flags-runtime");
    flagEnabled = await pythonBackendEnabled();
  } catch (err) {
    console.error("ichiba-python-backend flag failed to evaluate; using canonical backend", err);
  }
  return resolveCatalogBackend(flagEnabled);
}
