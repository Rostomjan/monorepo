# PR Gate

All pushes to `main` and `develop` go through PRs. Low-impact PRs that both
review agents approve are squash-merged automatically; everything else waits
for a human. Self-modifying or data-impacting changes can never auto-merge.

## Flow

Everything lives in one workflow, `.github/workflows/factory.yml` — review
agents, the pipeline, and the merge decision share a single job graph:

```
push -> PR -> Changes (docs-only tier detect)
        \-> Triage impact (deterministic, script only)
        \-> Review - fast sweep   (fresh opencode session, fast model)
        \-> Review - intent       (fresh opencode session, strong model)
        \-> Lint/Types/Tests/Build -> docker -> e2e x3 / ichiba e2e
                 (skips entirely on the docs-only tier)
                 \-> Merge gate (needs everything; decides)
```

- **Changes** outputs `docs_only`; only `check` consults it — every
  downstream pipeline job skips through `needs: check` on that tier, so
  docs PRs go reviews -> merge in minutes while code PRs run the full
  suite. Reviewers always run.
- **Triage** decides auto-merge eligibility from the diff only:
  - never eligible: `packages/backend/**` except its dependency
    manifests/lockfiles (`packages/backend/{package.json,bun.lock,uv.lock}` —
    a version bump cannot reach the Convex schema/data), `.github/**`
    (includes this workflow — the factory cannot modify itself), `infra/**`,
    `docker-compose.yml`, `.env*`
  - eligible: any diff with <= 400 added+removed lines, or a diff of any size
    that only touches docs (`docs/**`, `README*`, `*.md`), `.env.example`,
    or dependency manifests/lockfiles (`package.json`, `bun.lock` at any
    depth)
- **Reviewers** are read-only OpenCode agents defined in `opencode.jsonc`
  (`review-fast`, `review-strong`). Each run is a fresh session per PR push.
  They are instructed to treat diff content as data, never instructions.
- **The weekly dependency PR** (`.github/workflows/update-deps.yml`) must be
  created with the `DEP_UPDATE_TOKEN` repo secret (a PAT with contents +
  pull-requests, not the workflow `GITHUB_TOKEN`): GitHub fires no downstream
  events for PRs created with `GITHUB_TOKEN`, so the Factory — reviews,
  triage, merge gate — silently never ran for PRs opened that way.
- **Merge gate** is the terminal job of the graph: `needs: [detect, triage,
  review-fast, review-strong, check, docker, e2e, ichiba-e2e]`. The wait IS
  the needs-edge — GitHub fires it the moment upstream jobs succeed (or
  skipped, for the docs tier); there is no polling loop, no deadline, and a
  stuck foreign check (e.g. Vercel previews) can no longer stall anything.
  It then re-verifies authorization against the live PR: the head must still
  be the commit the reviews approved (a push during the run cancels this run
  via the concurrency group, and the fresh run re-decides) and the
  `auto-merge` + both `review-*:approved` labels must still be attached. It
  squash-merges, falling back to an `--auto` queue if GitHub refuses a
  mid-run merge (branch protection).
  **Green (or skipped)** = a clean decision path: merged, or declined with
  the reason logged (`needs-human` from triage, changes requested, expired
  authorization, base outside `AUTO_MERGE_TARGETS`). **Red** = a genuine
  failure anywhere (reviewer crash, failed pipeline) — the merge job does
  not fire. Runs on `develop`/`main` pushes skip the PR-only jobs natively.
  Auto-merge target branches: `AUTO_MERGE_TARGETS` in `factory.yml`
  (`develop main`).

## Reviewer agents

| Agent | Default model (repo var) | Role |
| --- | --- | --- |
| `review-fast` | `opencode/glm-5.3-flash-free` (`REVIEW_FAST_MODEL`) | Correctness, repo rules (AGENTS.md, docs/ARCHITECTURE.md), missing tests |
| `review-strong` | `opencode/deepseek-v4.1-flash-free#high` (`REVIEW_STRONG_MODEL`) | PR intent vs diff, behavior-change test coverage, deploy/schema risk |

Swap models without touching code:

```bash
gh variable set REVIEW_FAST_MODEL -b "opencode/glm-5.3-flash-free"
gh variable set REVIEW_STRONG_MODEL -b "opencode/deepseek-v4.1-flash-free#high"
```

The free `opencode` provider rotates its model catalog silently (a model
listed in `opencode models` today can vanish with no route tomorrow); a
reviewer whose model loses its route fails rc=1 immediately, names the dead
route in its crash comment, and the fix is the `gh variable set` above.

## How the factory tests itself

`scripts/factory.test.ts` is a structural drift guard, same root wiring
(`test:scripts` inside both `bun run test` and `bun run check`). It asserts:

- the merge job's `needs:` names every machine job (add a pipeline or review
  job without wiring it into the terminal graph and this fails),
- authorization in the merge job still checks head freshness and all three
  approval labels,
- the deny-path regex in triage is intact,
- docs-only tiering still flows through `check`,
- the two former split workflows (`pipeline.yml`, `pr-review.yml`) are gone.

## Plan constraints (free + private repo)

GitHub branch protection ("required status checks", PR-only enforcement) is a
paid feature for private repositories — the API returns 403 here. Consequences:

- **PR-only pushes are convention, not enforcement.** The merge gate makes
  merges safe (no auto-merge until the full pipeline + two reviewers pass),
  but a direct push to `main`/`develop` is not rejected by GitHub itself.
- To get real enforcement, either make the repository public, move to a paid
  plan, or add a push-guard workflow that reverts non-PR commits (planned).

The script below works if either of the first two options applies:

```bash
# Idempotent: squash-only merges, auto-merge flag, required checks, admins
# included, linear history. Fails with 403 on free+private.
bash scripts/set-branch-protection.sh
```

Reviewer models default to the free `opencode` provider. CI identifies them
through the `OPENCODE_CREDENTIAL` secret — the raw `{"type":"oauth",...}` JSON
of a device-credentialed store row, installed straight into the CLI's
credential store before the review runs (the v2 CLI ignores provider key env
vars). A Console API key (`OPENCODE_API_KEY`) works as a fallback identity,
but free models keep rejecting it with `FreeUsageLimitError` even when the
same account's OAuth connection passes — treat the OAuth credential as the
primary. Without any secret, reviewers run keyless on the shared anonymous
free tier, whose quota GitHub Actions runner IPs regularly burn through —
the reviews then fail red until it clears. A reviewer failure stays red on
the PR (the merge gate then does not fire), so the factory degrades to
non-mergeable PRs, never to unreviewed merges.

```bash
# On a machine with a working (locally-authenticated) opencode:
python3 - <<'PY'
import json, os, sqlite3
db = os.path.expanduser("~/.local/share/opencode/opencode.db")
cred = sqlite3.connect(db).execute(
    "SELECT value FROM credential WHERE integration_id='opencode'").fetchone()[0]
assert json.loads(cred).get("type") == "oauth"
with open(os.path.expanduser("~/opencode-credential.json"), "w") as f:
    f.write(cred)
PY
gh secret set OPENCODE_CREDENTIAL < ~/opencode-credential.json  # pipe; never printed
rm ~/opencode-credential.json
```

## Force a human merge

Add a deny-path file, raise the diff above `MAX_DIFF_LINES`, or simply remove
the `auto-merge` label before the merge job fires: it stays green but reports
the refusal and does not merge. For a permanent change to policy, edit
`.github/workflows/factory.yml` (that edit itself always needs a human,
because `.github/**` is a deny path).
