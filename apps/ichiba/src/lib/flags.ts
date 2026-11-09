import { flag } from "flags/next";
import { vercelAdapter } from "@flags-sdk/vercel";

/**
 * Flag declarations ONLY — this module is passed wholesale to
 * getProviderData (Flags Explorer), so nothing runtime-ish may live here
 * (the Flags discovery endpoint rejects non-flag exports). The per-request
 * deduped evaluation wrapper lives in flags-runtime.ts.
 *
 * Catalog listings served by the ichiba-py Django twin instead of the
 * built-in drizzle/RSC path: same Postgres, contract-tested byte-for-byte
 * (docs/DUAL_BACKEND.md). Scope: `queryProducts` + `listShops` only —
 * entity reads (product/shop detail, cart) and all writes stay canonical
 * until the python service gains those endpoints.
 *
 * Evaluated through Vercel Flags (dashboard-managed, OIDC-authed). When the
 * adapter cannot evaluate (local dev without `vercel env pull`, docker),
 * the flag falls back to `defaultValue` — off — and
 * backend.resolveCatalogBackend additionally requires ICHIBA_API_URL, so
 * the app degrades to the canonical path, never to an error.
 */
export const pythonBackendFlag = flag<boolean>({
  key: "ichiba-python-backend",
  description:
    "Serve ichiba catalog listings from the Python (Django) twin (apps/ichiba-py, :3021) instead of the built-in drizzle path",
  defaultValue: false,
  adapter: vercelAdapter,
});
