/**
 * Fixture tests for the PR Gate's statusCheckRollup jq filters.
 *
 * The Gate job in .github/workflows/pr-review.yml shells out to
 * `gh pr view --json statusCheckRollup -q '<expr>'` (gh's --jq takes a single
 * expression: no --arg support). These tests (1) run the exact filter text
 * against fixtures, (2) assert the workflow file still contains that exact
 * text, so a filter edit cannot silently diverge from tested behavior.
 */
import { expect, test } from "bun:test";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Verbatim from .github/workflows/pr-review.yml (Gate job). Update HERE AND
// THERE together. Whitespace is normalized during comparison.
const NOT_DONE_FILTER = `[.statusCheckRollup[]
                | select(.name != "Gate")
                | select(
                    if .status != null then .status != "COMPLETED"
                    else (.state // "PENDING") == "PENDING"
                    end)]
              | length`;
const FAILED_FILTER = `[.statusCheckRollup[]
              | select(.name != "Gate")
              | select(
                  if .conclusion != null then
                    (.conclusion == "FAILURE" or .conclusion == "CANCELLED" or .conclusion == "TIMED_OUT"
                     or .conclusion == "STARTUP_FAILURE" or .conclusion == "ACTION_REQUIRED")
                  else
                    (.state == "FAILURE" or .state == "ERROR")
                  end)]
            | .[].name`;

// gh's --jq prints values in raw mode (like `jq -r`); mirror that here.
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

type Check = { name: string; status?: string; conclusion?: string | null; state?: string };

/** Mixed: modern CheckRuns (.status/.conclusion) + legacy commit statuses (.state). */
const MIXED: { statusCheckRollup: Check[] } = {
  statusCheckRollup: [
    { name: "Lint, Types, Unit tests, Build", status: "IN_PROGRESS", conclusion: null },
    { name: "Playwright (chromium)", status: "COMPLETED", conclusion: "SUCCESS" },
    { name: "vercel", state: "PENDING", conclusion: null }, // legacy status: not done
    { name: "legacy-green", state: "SUCCESS", conclusion: null }, // legacy status: done
    { name: "legacy-red", state: "FAILURE", conclusion: null }, // legacy status: failed
    { name: "infra-red", status: "COMPLETED", conclusion: "STARTUP_FAILURE" }, // runner infra failure
    { name: "Ichiba e2e (chromium)", status: "COMPLETED", conclusion: "TIMED_OUT" },
    { name: "Gate", status: "IN_PROGRESS", conclusion: null }, // must be excluded everywhere
  ],
};

const ALL_DONE: { statusCheckRollup: Check[] } = {
  statusCheckRollup: [
    { name: "Lint, Types, Unit tests, Build", status: "COMPLETED", conclusion: "SUCCESS" },
    { name: "legacy-green", state: "SUCCESS", conclusion: null },
    { name: "Gate", status: "IN_PROGRESS", conclusion: null },
  ],
};

test.skipIf(!HAS_JQ)(
  "rollup fixtures: not-done counts queued + legacy-pending, excludes Gate",
  () => {
    expect(jq(NOT_DONE_FILTER, MIXED)).toBe("2"); // Lint(queued), vercel(legacy-pending)
    expect(jq(NOT_DONE_FILTER, ALL_DONE)).toBe("0");
  },
);

test.skipIf(!HAS_JQ)(
  "rollup fixtures: failed selects CheckRun failures/cancel/timeout + legacy FAILURE/ERROR",
  () => {
    expect(jq(FAILED_FILTER, MIXED).split("\n").sort()).toEqual([
      "Ichiba e2e (chromium)",
      "infra-red",
      "legacy-red",
    ]);
    expect(jq(FAILED_FILTER, ALL_DONE)).toBe("");
  },
);

test("workflow file still contains the tested filters verbatim (drift guard)", () => {
  const yml = readFileSync(
    join(import.meta.dir, "..", ".github", "workflows", "pr-review.yml"),
    "utf8",
  );
  expect(squash(yml)).toContain(squash(NOT_DONE_FILTER));
  expect(squash(yml)).toContain(squash(FAILED_FILTER));
});
