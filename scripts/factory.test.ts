/**
 * Structural drift guard for the unified Factory workflow.
 *
 * The Factory (.github/workflows/factory.yml) is one job graph: triage +
 * reviewers + full pipeline + a terminal merge job. These tests assert the
 * workflow file keeps the policy invariants that make it safe and tiered —
 * so an edit that silently breaks them fails `bun run test` (wired into
 * `bun run check` via the root `test:scripts` script).
 */
import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const yml = readFileSync(
  join(import.meta.dir, "..", ".github", "workflows", "factory.yml"),
  "utf8",
);

// Whitespace-normalized containment check (jq expressions are single lines
// in the YAML; rendering may differ in indentation only).
const squash = (s: string) => s.replace(/\s+/g, "");
const expectContains = (v: string) => {
  expect(squash(yml)).toContain(squash(v));
};

test("merge job is terminal over every machine job (needs-wiring guard)", () => {
  // A new pipeline/review job added to factory.yml but not wired here would
  // silently stop being a merge precondition.
  expectContains(
    "needs: [detect, triage, review-fast, review-strong, check, docker, e2e, ichiba-e2e]",
  );
});

test("merge gate only fires on green-or-skipped upstreams, PRs only", () => {
  // Skipped = the docs-only tier; failure/cancelled must never proceed.
  expectContains("!contains(needs.*.result, 'failure')");
  expectContains("!contains(needs.*.result, 'cancelled')");
  expectContains("github.event_name == 'pull_request'");
});

test("authorization still enforces head freshness + all three approvals", () => {
  expectContains('--json headRefOid -q .headRefOid');
  for (const label of ["auto-merge", "review-fast:approved", "review-strong:approved"]) {
    expectContains(`grep -qx "${label}"`);
  }
});

test("deny paths keep their human gate in triage", () => {
  expectContains(
    "deny_regex='^(packages/backend/|\\.github/|infra/|docker-compose\\.yml$|\\.env)'",
  );
  // The backend deny path is hard, except for dependency manifests/lockfiles:
  // a version bump cannot reach the Convex schema.
  expectContains(
    "deny_exception_regex='^packages/backend/(package\\.json|bun\\.lock|uv\\.lock)$'",
  );
});

test("large-diff allowance recognizes dep files at any depth", () => {
  // Workspace manifests (apps/*/package.json) are dep-only files, not just the
  // root package.json — otherwise wide dep chains trip MAX_DIFF_LINES.
  expectContains(
    "docs_regex='^(docs/|README|\\.env\\.example|(.*/)?package\\.json$|(.*/)?bun\\.lock$)'",
  );
});

test("docs-only tiering lives in the job graph (detect -> check skip)", () => {
  expectContains(
    "[.files[].path] | length == 0 or all(test(\"^(docs/|.*\\\\.(md|mdx)$)\")) | tostring",
  );
  // The one job that listens to the tier; everything downstream skips via
  // needs: check.
  expectContains("if: needs.detect.outputs.docs_only != 'true'");
});

test("merge path is squash + branch delete, with the --auto fallback", () => {
  expectContains("--squash --delete-branch");
  expectContains("--squash --auto --delete-branch");
});

test("the two split workflows are gone", () => {
  const wfDir = join(import.meta.dir, "..", ".github", "workflows");
  expect(existsSync(join(wfDir, "pipeline.yml"))).toBe(false);
  expect(existsSync(join(wfDir, "pr-review.yml"))).toBe(false);
});
