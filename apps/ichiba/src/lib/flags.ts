import { flag } from "flags/next";
import { vercelAdapter } from "@flags-sdk/vercel";

/**
 * Flag declarations ONLY — this module is passed wholesale to
 * getProviderData (Flags Explorer), so nothing runtime-ish may live here
 * (the Flags discovery endpoint rejects non-flag exports). The per-request
 * deduped evaluation wrapper lives in flags-runtime.ts.
 *
 * Each flag routes ichiba catalog listings to a backend twin instead of
 * the built-in drizzle/RSC path: same Postgres, contract-tested
 * byte-for-byte (docs/BACKEND_TWINS.md). Scope: `queryProducts` +
 * `listShops` only — entity reads (product/shop detail, cart) and all
 * writes stay canonical until a twin gains those endpoints, in every
 * backend, as a new contract change.
 *
 * Evaluated through Vercel Flags (dashboard-managed, OIDC-authed). When the
 * adapter cannot evaluate (local dev without `vercel env pull`, docker),
 * the flag falls back to `defaultValue` — off — and
 * backend.resolveCatalogBackend additionally requires the twin's base-url
 * env, so the app degrades to the canonical path, never to an error.
 */

export const pythonBackendFlag = flag<boolean>({
  key: "ichiba-python-backend",
  description:
    "Serve ichiba catalog listings from the Python (Django) twin (apps/ichiba-py, :3021) instead of the built-in drizzle path",
  defaultValue: false,
  adapter: vercelAdapter,
});

export const goBackendFlag = flag<boolean>({
  key: "ichiba-go-backend",
  description:
    "Serve ichiba catalog listings from the Go twin (apps/ichiba-go, :3022) instead of the built-in drizzle path",
  defaultValue: false,
  adapter: vercelAdapter,
});
