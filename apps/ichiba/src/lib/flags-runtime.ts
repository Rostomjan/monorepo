import { dedupe } from "flags/next";
import { goBackendFlag, pythonBackendFlag } from "./flags";
import type { RemoteBackendId } from "./backend";

/**
 * One evaluation per backend per request even when both listShops() and
 * queryProducts() run in the same RSC render. Runtime plumbing only
 * (dynamic import from backend.ts) — pure importers and unit tests never
 * load flags/next or the Vercel adapter's request-context machinery.
 *
 * PLUG-IN RULE: a new backend twin adds its flag in flags.ts and one entry
 * here (backend.ts's registry drives everything else).
 */
const evaluators: Record<RemoteBackendId, () => Promise<boolean>> = {
  python: dedupe(async () => pythonBackendFlag()),
  go: dedupe(async () => goBackendFlag()),
};

export function backendFlagEnabled(id: RemoteBackendId): Promise<boolean> {
  const evaluate = evaluators[id];
  if (!evaluate) throw new Error(`no flag evaluator for backend: ${id}`);
  return evaluate();
}
