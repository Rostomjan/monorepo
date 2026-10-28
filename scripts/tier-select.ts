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
 *   makes adding a new shared package require no selector edits. scripts/
 *   and root configs/lockfiles are shared the same way.
 * - Known app code selects its tier explicitly (apps/e2e selects both e2e
 *   tiers). apps/kotoba and apps/docs are the explicit NO-heavy set: the
 *   lint/type/test/build tier covers them fully, and they stay out of the
 *   "unknown" fallback by being named here.
 * - .github/** is the deliberate check-only surface (machine-validated by
 *   its own review machinery, verified by the check tier).
 * - ANY other unknown path (templates/, unmapped root files) falls back to
 *   the heaviest tier so nothing silently skips validation.
 * - Empty diff: skipped heavy tiers, check still runs (docs_only=false --
 *   identical to a pushed empty change).
 *
 * Trusted execution (self-edit defense): the detect job never runs THIS
 * file from the PR head — it runs origin/main's copy (origin/develop's
 * during the pre-promotion window; the workflow's run-everything fallback
 * before that). HEAD edits here only affect the copy the reviewers judge,
 * not gate selection, until they land on a squash-merged ref.
 */
export type Tiers = {
  docs_only: boolean;
  docker_needed: boolean;
  chat_e2e_needed: boolean;
  ichiba_e2e_needed: boolean;
};

const SHARED_OR_ROOT =
  /^packages\/|^scripts\/|^bun\.lock$|^package\.json$|^turbo\.json$/;

export function computeTiers(files: { path?: string }[]): Tiers {
  const paths = files.map((f) => f.path ?? "");
  if (paths.length === 0) {
    return {
      docs_only: false,
      docker_needed: false,
      chat_e2e_needed: false,
      ichiba_e2e_needed: false,
    };
  }

  const docs_only = paths.every(
    (p) => /^docs\//.test(p) || /\.(md|mdx)$/.test(p),
  );
  if (docs_only) {
    // Docs tier: reviewers only; the pipeline tier stays skipped.
    return {
      docs_only,
      docker_needed: false,
      chat_e2e_needed: false,
      ichiba_e2e_needed: false,
    };
  }

  const shared = paths.some((p) => SHARED_OR_ROOT.test(p));

  // Known surfaces: app code that maps to a specific tier, apps with no
  // expensive tier at all, and .github/** which is validated by the machine
  // review machinery itself + the check tier.
  const appTiers = {
    docker: paths.some((p) => /^(apps\/(api|chat))\//.test(p)),
    chat_e2e: paths.some((p) => /^(apps\/(chat|kanji|api|e2e))\//.test(p)),
    ichiba: paths.some((p) => /^(apps\/(ichiba|e2e))\//.test(p)),
  };
  // Single-workload apps the lint/type/test/build tier fully covers (no
  // containers, no e2e); keep them OUT of the "unknown" fallback by naming
  // them explicitly. New apps join here or the appTiers map — never fall
  // through silently either way.
  const noHeavyApp = paths.some((p) => /^(apps\/(kotoba|docs))\//.test(p));
  const githubOnly = paths.every((p) => /^\.github\//.test(p));

  // Unknown files (templates/, root configs outside package.json/turbo.json,
  // anything unmapped) must not silently skip validation: run the heaviest
  // tier as the safe default.
  const unknown =
    !shared &&
    !noHeavyApp &&
    !githubOnly &&
    !appTiers.docker &&
    !appTiers.chat_e2e &&
    !appTiers.ichiba;

  return {
    docs_only,
    docker_needed: shared || appTiers.docker || unknown,
    chat_e2e_needed: shared || appTiers.chat_e2e || unknown,
    ichiba_e2e_needed: shared || appTiers.ichiba || unknown,
  };
}

export function computeTiersFromFilesJson(input: string): Tiers {
  const data = JSON.parse(input) as { files?: { path?: string }[] };
  return computeTiers(data.files ?? []);
}

if (import.meta.main) {
  const input = await new Response(Bun.stdin.stream()).text();
  process.stdout.write(
    JSON.stringify(computeTiersFromFilesJson(input), null, 2) + "\n",
  );
}
