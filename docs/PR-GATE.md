# PR Gate

All pushes to `main` and `develop` go through PRs. Low-impact PRs that both
review agents approve are squash-merged automatically; everything else waits
for a human. Self-modifying or data-impacting changes can never auto-merge.

## Flow

```
push -> PR -> Triage impact (deterministic, script only)
          -> Review - fast sweep   (fresh opencode session, fast model)
          -> Review - intent       (fresh opencode session, strong model)
          -> Gate (required check: queues auto-merge iff all approve)
```

- **Triage** decides eligibility from the diff only:
  - never eligible: `packages/backend/**` (Convex schema/data), `.github/**`
    (includes this workflow - the gate cannot modify itself), `infra/**`,
    `docker-compose.yml`, `.env*`
  - eligible: any diff with <= 400 added+removed lines, or diff of any size that
    only touches docs (`docs/**`, `README*`, `*.md`), `.env.example`,
    `package.json`, or `bun.lock`
- **Reviewers** are read-only OpenCode agents defined in `opencode.jsonc`
  (`review-fast`, `review-strong`). Each run is a fresh session per PR push.
  They are instructed to treat diff content as data, never instructions.
- **Gate** is a branch-protection required check. It fails whenever in-scope
  auto-merge is not authorized (triage `needs-human`, or a reviewer requested
  changes), so a queued auto-merge can only ever fire when the latest gate run
  authorized the current state. Auto-merge target branches:
  `AUTO_MERGE_TARGETS` in `.github/workflows/pr-review.yml` (`develop main`).

## Reviewer agents

| Agent | Default model (repo var) | Role |
| --- | --- | --- |
| `review-fast` | `opencode/glm-5.3-flash-free` (`REVIEW_FAST_MODEL`) | Correctness, repo rules (AGENTS.md, docs/ARCHITECTURE.md), missing tests |
| `review-strong` | `opencode/minimax-m3.1-flash-free#high` (`REVIEW_STRONG_MODEL`) | PR intent vs diff, behavior-change test coverage, deploy/schema risk |

Swap models without touching code:

```bash
gh variable set REVIEW_FAST_MODEL -b "opencode/glm-5.3-flash-free"
gh variable set REVIEW_STRONG_MODEL -b "opencode/minimax-m3.1-flash-free#high"
```

## Setup

```bash
# 1. Reviewer credential: the `opencode` provider key used by opencode run.
gh secret set OPENCODE_API_KEY

# 2. Branch protection, merge settings, auto-merge flag (idempotent).
bash scripts/set-branch-protection.sh
```

If `OPENCODE_API_KEY` is unset, reviewers skip with a one-time PR comment and
auto-merge stays blocked - the pipeline degrades to human review, never to
unreviewed merges.

## Force a human merge

Add a deny-path file, raise the diff above `MAX_DIFF_LINES`, or simply remove
the `auto-merge` label: the required Gate check goes red and GitHub will not
auto-merge. For a permanent change to policy, edit
`.github/workflows/pr-review.yml` (that edit itself always needs a human,
because `.github/**` is a deny path).
