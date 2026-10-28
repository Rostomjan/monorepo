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
import { computeTiers, type Tiers } from "./tier-select";

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
  expectContains("--json headRefOid -q .headRefOid");
  for (const label of [
    "auto-merge",
    "review-fast:approved",
    "review-strong:approved",
  ]) {
    expectContains(`grep -qx "${label}"`);
  }
});

test("deny paths keep their human gate in triage", () => {
  expectContains(
    "deny_regex='^(packages/backend/|\\.github/|infra/|docker-compose\\.yml$|\\.env)'",
  );
});

test("tier selection is centralized in scripts/tier-select.ts (wired in detect)", () => {
  // Detect pipes the PR file list into a COPY of the module fetched from a
  // trusted ref (never the PR head); the trusted-ref guards themselves live
  // in the gate-integrity test below.
  expectContains('bun "$sel"');
  // The one job that listens to the docs tier; everything downstream skips
  // via needs: check.
  expectContains("if: needs.detect.outputs.docs_only != 'true'");
});

test("affected selectors gate the expensive jobs, pushes bypass them", () => {
  for (const out of ["docker_needed", "chat_e2e_needed", "ichiba_e2e_needed"]) {
    expectContains(
      `github.event_name == 'push' || needs.detect.outputs.${out} == 'true'`,
    );
  }
  // Detect always emits the selectors, even on pushes (so stale outputs
  // can never disable a deploy path).
  for (const out of [
    "docs_only",
    "docker_needed",
    "chat_e2e_needed",
    "ichiba_e2e_needed",
  ]) {
    expectContains(`echo "$out=false" >> "$GITHUB_OUTPUT"`);
  }
});

test("detect's tier selectors are declared as job outputs (wiring guard)", () => {
  // GitHub only exposes step outputs that the job's outputs: map declares;
  // an undeclared selector would read as empty and silently skip its tier
  // for every PR.
  for (const out of [
    "docs_only",
    "docker_needed",
    "chat_e2e_needed",
    "ichiba_e2e_needed",
  ]) {
    expectContains(out + ": ${{ steps.detect.outputs." + out + " }}");
  }
});

test("turbo remote cache is optional and secrets-safe", () => {
  expectContains("_TURBO_TOKEN");
  expectContains('if [ -z "$_TURBO_TOKEN" ]');
  expectContains('echo "TURBO_TOKEN=$_TURBO_TOKEN" >> "$GITHUB_ENV"');
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

// ---- tier-selection behavior (the same code path the detect job runs) ----

const f = (path: string): { path?: string } => ({ path });
const docsFlag = (t: Tiers) => t.docs_only;

test("tier table: docs-only skips the pipeline tier entirely", () => {
  const t = computeTiers([f("docs/api.md"), f("README.md")]);
  expect(docsFlag(t)).toBe(true);
  expect(t.docker_needed && t.chat_e2e_needed && t.ichiba_e2e_needed).toBe(
    false,
  );
});

test("tier table: app changes select exactly their tiers", () => {
  const ichiba = computeTiers([f("apps/ichiba/src/cli.ts")]);
  expect(docsFlag(ichiba)).toBe(false);
  expect(ichiba.ichiba_e2e_needed).toBe(true);
  expect(ichiba.docker_needed).toBe(false);
  expect(ichiba.chat_e2e_needed).toBe(false);

  const kanji = computeTiers([f("apps/kanji/src/page.tsx")]);
  expect(kanji.chat_e2e_needed).toBe(true);
  expect(kanji.docker_needed).toBe(false);
  expect(kanji.ichiba_e2e_needed).toBe(false);
});

test("tier table: any packages/* change enables every tier (future packages too)", () => {
  for (const p of [
    "packages/tailwind-config/base.css", // ichiba actually imports this
    "packages/never-seen-before/index.ts", // a package added after this test
    "packages/backend/schema.ts",
    "bun.lock",
    "scripts/scaffold.ts",
  ]) {
    const t = computeTiers([f(p)]);
    expect(t.docker_needed && t.chat_e2e_needed && t.ichiba_e2e_needed).toBe(
      true,
    );
  }
});

test("tier table: api change rebuilds containers + chat e2e, leaves ichiba alone", () => {
  const t = computeTiers([f("apps/api/src/handler.ts")]);
  expect(t.docker_needed).toBe(true);
  expect(t.chat_e2e_needed).toBe(true);
  expect(t.ichiba_e2e_needed).toBe(false);
});

test("tier table: .github-only changes skip every expensive tier", () => {
  const t = computeTiers([f(".github/workflows/factory.yml")]);
  expect(t.docs_only).toBe(false);
  expect(t.docker_needed).toBe(false);
  expect(t.chat_e2e_needed).toBe(false);
  expect(t.ichiba_e2e_needed).toBe(false);
});

test("tier table: unknown files fall back to the heaviest tier", () => {
  for (const p of ["docker-compose.yml", "some-random-root-file"]) {
    const t = computeTiers([f(p)]);
    expect(t.docker_needed).toBe(true);
    expect(t.chat_e2e_needed).toBe(true);
    expect(t.ichiba_e2e_needed).toBe(true);
  }
});

test("tier table: apps/e2e changes run both e2e suites", () => {
  const t = computeTiers([f("apps/e2e/tests/chat.spec.ts")]);
  expect(t.chat_e2e_needed).toBe(true);
  expect(t.ichiba_e2e_needed).toBe(true);
  expect(t.docker_needed).toBe(false);
});

test("tier table: kotoba/docs-only PRs run no heavy tier", () => {
  for (const p of [
    "apps/kotoba/src/App.tsx",
    "apps/docs/app/page.tsx",
    "apps/docs/lib/nav.ts",
  ]) {
    const t = computeTiers([f(p)]);
    expect(t.docs_only).toBe(false);
    expect(t.docker_needed).toBe(false);
    expect(t.chat_e2e_needed).toBe(false);
    expect(t.ichiba_e2e_needed).toBe(false);
  }
});

test("tier table: mixing a no-heavy app with a tiered app runs that tier", () => {
  const t = computeTiers([f("apps/kotoba/src/a.ts"), f("apps/chat/src/b.ts")]);
  expect(t.chat_e2e_needed).toBe(true);
  expect(t.docker_needed).toBe(true);
  expect(t.ichiba_e2e_needed).toBe(false);
});

test("tier table: unknown file mixed with known surfaces forces every heavy tier", () => {
  // Per-path classification: one known path must NEVER mask an unmapped
  // rider (the diff-level-unknown trap the strong reviewer caught).
  const t = computeTiers([f("apps/kotoba/src/x.ts"), f("tsconfig.base.json")]);
  expect(t.docker_needed).toBe(true);
  expect(t.chat_e2e_needed).toBe(true);
  expect(t.ichiba_e2e_needed).toBe(true);

  const t2 = computeTiers([f("apps/chat/src/a.ts"), f("templates/web/p.njk")]);
  expect(t2.docker_needed).toBe(true);
  expect(t2.chat_e2e_needed).toBe(true);
  expect(t2.ichiba_e2e_needed).toBe(true);
});

test("gate integrity: tier selection never runs from the PR head", () => {
  // The detect job must execute the selector from a squash-merged ref so a
  // PR cannot edit its own gates out (scripts/** is not a deny path).
  expectContains("git show origin/main:scripts/tier-select.ts");
  expectContains("git show origin/develop:scripts/tier-select.ts");
  expect(squash(yml)).not.toContain(squash("bun scripts/tier-select.ts"));
  // And when no trusted copy exists yet: fail toward MORE validation.
  expectContains(
    '"docker_needed":true,"chat_e2e_needed":true,"ichiba_e2e_needed":true',
  );
  expectContains("running the FULL graph");
});

test("tier table: empty diff disables everything", () => {
  const t = computeTiers([]);
  expect(Object.values(t).every((v) => v === false)).toBe(true);
});
