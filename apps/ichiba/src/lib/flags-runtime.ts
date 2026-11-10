import { dedupe } from "flags/next";
import { pythonBackendFlag } from "./flags";

/**
 * One evaluation per request even when both listShops() and queryProducts()
 * run in the same RSC render. Runtime plumbing only (dynamic import from
 * backend.ts) — pure importers and unit tests never load flags/next or the
 * Vercel adapter's request-context machinery.
 */
export const pythonBackendEnabled = dedupe(async () => pythonBackendFlag());
