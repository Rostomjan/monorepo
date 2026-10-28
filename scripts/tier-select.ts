/**
 * Tier selection for the Factory's affected-graph CI — the single source of
 * truth for which expensive jobs a PR's diff needs.
 *
 * Called by .github/workflows/factory.yml's `detect` job with `gh pr view
 * --json files`-shaped JSON on stdin; prints a JSON object of tier flags.
 *
 * Rules (kept deliberately coarse):
 * - docs-only tier: every changed path is docs/**, *.md or *.mdx.
 * - ALL of packages/ counts as shared: any package change is eligible to
 *   affect every app (visual configs, shared UI, backend contracts). This
 *   makes adding a new shared package require no selector edits.
 * - Each expensive tier additionally lists the apps whose code or e2e it
 *   exercises, plus root config/lockfiles.
 * - Changes outside these patterns (unknown files) enable docker (the
 *   closest to "everything") so nothing silently skips validation.
 */
export type Tiers = {
  docs_only: boolean;
  docker_needed: boolean;
  chat_e2e_needed: boolean;
  ichiba_e2e_needed: boolean;
};

const SHARED_OR_ROOT = /^packages\/|^scripts\/|^bun\.lock$|^package\.json$|^turbo\.json$/;

export function computeTiers(files: { path?: string }[]): Tiers {
  const paths = files.map((f) => f.path ?? "");
  if (paths.length === 0) {
    return { docs_only: false, docker_needed: false, chat_e2e_needed: false, ichiba_e2e_needed: false };
  }

  const docs_only = paths.every((p) => /^docs\//.test(p) || /\.(md|mdx)$/.test(p));
  if (docs_only) {
    // Docs tier: reviewers only; the pipeline tier stays skipped.
    return { docs_only, docker_needed: false, chat_e2e_needed: false, ichiba_e2e_needed: false };
  }

  const shared = paths.some((p) => SHARED_OR_ROOT.test(p));
  const inApp = (p: string, apps: string) => new RegExp(`^(apps/(${apps}|e2e))/`).test(p);

  return {
    docs_only,
    docker_needed: shared || paths.some((p) => inApp(p, "api|chat")),
    chat_e2e_needed: shared || paths.some((p) => inApp(p, "api|chat|kanji")),
    ichiba_e2e_needed: shared || paths.some((p) => inApp(p, "ichiba")),
  };
}

export function computeTiersFromFilesJson(input: string): Tiers {
  const data = JSON.parse(input) as { files?: { path?: string }[] };
  return computeTiers(data.files ?? []);
}

if (import.meta.main) {
  const input = await new Response(Bun.stdin.stream()).text();
  process.stdout.write(JSON.stringify(computeTiersFromFilesJson(input), null, 2) + "\n");
}