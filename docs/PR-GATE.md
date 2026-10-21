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
- **Gate** waits for **every other check in this repository** to complete (a
  looping watch), verifies both reviewer-approval labels, then squash-merges
  directly. It red-fails whenever in-scope auto-merge is not authorized
  (triage `needs-human`, a reviewer requested changes, any pipeline check
  failed, or the watch times out). Auto-merge target branches:
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

## Plan constraints (free + private repo)

GitHub branch protection ("required status checks", PR-only enforcement) is a
paid feature for private repositories — the API returns 403 here. Consequences:

- **PR-only pushes are convention, not enforcement.** The Gate makes merges
  safe (no auto-merge until the full pipeline + two reviewers pass), but a
  direct push to `main`/`develop` is not rejected by GitHub itself.
- To get real enforcement, either make the repository public, move to a paid
  plan, or add a push-guard workflow that reverts non-PR commits (planned).

The script below works if either of the first two options applies:

```bash
# Idempotent: squash-only merges, auto-merge flag, required checks, admins
# included, linear history. Fails with 403 on free+private.
bash scripts/set-branch-protection.sh
```

Reviewer models default to the free `opencode` provider and run **keyless** in
CI — no secret needed. A reviewer failure always red-fails the Gate, so the
factory degrades to human-auditable merge blocks, never to unreviewed merges.

```bash
# Optional: only if you switch a reviewer model to a provider that needs auth.
gh secret set OPENCODE_API_KEY
```

## Force a human merge

Add a deny-path file, raise the diff above `MAX_DIFF_LINES`, or simply remove
the `auto-merge` label before the Gate finishes its check-wait: the Gate goes
red and will not merge. For a permanent change to policy, edit
`.github/workflows/pr-review.yml` (that edit itself always needs a human,
because `.github/**` is a deny path).
