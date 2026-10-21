/**
 * Fixture tests for the PR Gate's check-polling jq filters.
 *
 * The Gate job in .github/workflows/pr-review.yml polls via REST
 * (`/commits/{sha}/check-runs` + `/commits/{sha}/status`) and filters the
 * payloads with jq (gh's --jq takes a single expression: no --arg). These
 * tests (1) run the exact filter text against fixtures, (2) assert the
 * workflow file still contains that exact text, so a filter edit cannot
 * silently diverge from tested behavior.
 */
import { expect, test } from "bun:test";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Verbatim from .github/workflows/pr-review.yml (Gate job). Update HERE AND
// THERE together. Whitespace is normalized during comparison.
const PENDING_CHECKS_FILTER =
  "[(.check_runs // [])[] | select(.name != \"Gate\") | select(.status != \"COMPLETED\")] | length";
const PENDING_STATUSES_FILTER =
  "[(.statuses // [])[] | select(.state == \"PENDING\")] | length";
const FAILED_CHECKS_FILTER =
  "[(.check_runs // [])[] | select(.conclusion == \"FAILURE\" or .conclusion == \"CANCELLED\" or .conclusion == \"TIMED_OUT\" or .conclusion == \"STARTUP_FAILURE\" or .conclusion == \"ACTION_REQUIRED\") | .name] | join(\", \")";
const FAILED_STATUSES_FILTER =
  "[(.statuses // [])[] | select(.state == \"FAILURE\" or .state == \"ERROR\") | .context] | join(\", \")";

function jq(expr: string, input: unknown): string {
  const file = fixtureFile();
  writeFileSync(file, JSON.stringify(input));
  const proc = Bun.spawnSync({ cmd: ["jq", "-r", expr, file] });
  if (proc.exitCode !== 0) {
    throw new Error(`jq exited ${proc.exitCode}: ${proc.stderr.toString()}`);
  }
  return proc.stdout.toString().trim();
}

// The rollup filters shell out to `jq`, which is preinstalled on CI runners
// but not part of the Bun toolchain itself: skip (don't fail) when absent.
const HAS_JQ = Bun.spawnSync({ cmd: ["jq", "--version"] }).exitCode === 0;

const squash = (s: string) => s.replace(/\s+/g, "");

const fixtureFile = () => join(tmpdir(), `gate-jq-fixture-${process.pid}.json`);

process.on("exit", () => {
  const f = fixtureFile();
  if (existsSync(f)) rmSync(f);
});

type CheckRun = { name: string; status: string; conclusion: string | null };
type LegacyStatus = { context: string; state: string };

/** Modern GitHub Actions check runs (foreign apps' runs are absent: the
 * integration token cannot read them, which is exactly why the Gate polls
 * REST instead of the erroring statusCheckRollup GraphQL). */
const CHECK_RUNS: { check_runs: CheckRun[] } = {
  check_runs: [
    { name: "Lint, Types, Unit tests, Build", status: "IN_PROGRESS", conclusion: null },
    { name: "Playwright (chromium)", status: "COMPLETED", conclusion: "SUCCESS" },
    { name: "Ichiba e2e (chromium)", status: "COMPLETED", conclusion: "TIMED_OUT" },
    { name: "infra-red", status: "COMPLETED", conclusion: "STARTUP_FAILURE" },
    { name: "Gate", status: "IN_PROGRESS", conclusion: null }, // must be excluded everywhere
  ],
};

/** Legacy commit statuses (combined-status payload). */
const STATUSES: { state: string; statuses: LegacyStatus[] } = {
  state: "pending",
  statuses: [
    { context: "vercel", state: "PENDING" },
    { context: "legacy-green", state: "SUCCESS" },
    { context: "legacy-red", state: "FAILURE" },
  ],
};

const EMPTY: Record<string, never> = {};

test.skipIf(!HAS_JQ)("pending counts exclude Gate and tolerate an empty payload", () => {
  expect(jq(PENDING_CHECKS_FILTER, CHECK_RUNS)).toBe("1"); // Lint only
  expect(jq(PENDING_STATUSES_FILTER, STATUSES)).toBe("1"); // vercel
  expect(jq(PENDING_CHECKS_FILTER, EMPTY)).toBe("0");
  expect(jq(PENDING_STATUSES_FILTER, EMPTY)).toBe("0");
});

test.skipIf(!HAS_JQ)("failed lists CheckRun infrastructure failures + legacy FAILURE/ERROR", () => {
  expect(jq(FAILED_CHECKS_FILTER, CHECK_RUNS)).toBe("Ichiba e2e (chromium), infra-red");
  expect(jq(FAILED_STATUSES_FILTER, STATUSES)).toBe("legacy-red");
  expect(jq(FAILED_CHECKS_FILTER, EMPTY)).toBe("");
  expect(jq(FAILED_STATUSES_FILTER, EMPTY)).toBe("");
});

test("workflow file still contains the tested filters verbatim (drift guard)", () => {
  const yml = readFileSync(
    join(import.meta.dir, "..", ".github", "workflows", "pr-review.yml"),
    "utf8",
  );
  for (const filter of [PENDING_CHECKS_FILTER, PENDING_STATUSES_FILTER, FAILED_CHECKS_FILTER, FAILED_STATUSES_FILTER]) {
    expect(squash(yml)).toContain(squash(filter));
  }
});
