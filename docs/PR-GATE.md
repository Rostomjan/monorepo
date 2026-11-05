# PR Gate

All pushes to `main` and `develop` go through PRs. Low-impact PRs that triage
clears are squash-merged automatically when the pipeline is green; everything
else waits for a human. Self-modifying or data-impacting changes can never
auto-merge. PR review happens out-of-band via CodeRabbit (GitHub App) — it is
not part of this job graph, and nothing in the Factory waits on it.

## Flow

Everything machine-side lives in one workflow,
`.github/workflows/factory.yml` — the pipeline and the merge decision share a
single job graph:

```
push -> PR -> Changes (docs-only tier detect)
        \-> Triage impact (deterministic, script only)
        \-> Lint/Types/Tests/Build -> docker -> e2e x3 / ichiba e2e
                 (skips entirely on the docs-only tier)
                 \-> Merge gate (needs everything; decides)
CodeRabbit reviews each PR independently, on GitHub.
```

- **Changes** outputs `docs_only`; only `check` consults it — every
  downstream pipeline job skips through `needs: check` on that tier, so
  docs PRs go triage -> merge in minutes while code PRs run the full
  suite. The pipeline never stands between a docs PR and its merge.
- **Triage** decides auto-merge eligibility from the diff only:
  - never eligible: `packages/backend/**` except its dependency
    manifests/lockfiles (`packages/backend/{package.json,bun.lock,uv.lock}` —
    a version bump cannot reach the Convex schema/data), `.github/**`
    (includes this workflow — the factory cannot modify itself), `infra/**`,
    `docker-compose.yml`, `.env*`
  - eligible: any diff with <= 400 added+removed lines, or a diff of any size
    that only touches docs (`docs/**`, `README*`, `*.md`), `.env.example`,
    or dependency manifests/lockfiles (`package.json`, `bun.lock`, `uv.lock`
    at any depth)
- **The weekly dependency PR** (`.github/workflows/update-deps.yml`) must be
  created with the `DEP_UPDATE_TOKEN` repo secret (a PAT with contents +
  pull-requests, not the workflow `GITHUB_TOKEN`): GitHub fires no downstream
  events for PRs created with `GITHUB_TOKEN`, so the Factory — triage,
  merge gate — silently never ran for PRs opened that way.
- **Merge gate** is the terminal job of the graph: `needs: [detect, triage,
  check, docker, e2e, ichiba-e2e]`. The wait IS the needs-edge — GitHub fires
  it the moment upstream jobs succeed (or skipped, for the docs tier); there
  is no polling loop, no deadline, and a stuck foreign check (e.g. Vercel
  previews) can no longer stall anything. It then re-verifies authorization
  against the live PR: the head must still be the commit triage cleared (a
  push during the run cancels this run via the concurrency group, and the
  fresh run re-decides) and the `auto-merge` label must still be attached. It
  squash-merges, falling back to an `--auto` queue if GitHub refuses a
  mid-run merge (branch protection).
  **Green (or skipped)** = a clean decision path: merged, or declined with
  the reason logged (`needs-human` from triage, expired authorization, base
  outside `AUTO_MERGE_TARGETS`). **Red** = a genuine failure anywhere
  (failed pipeline) — the merge job does not fire. Runs on `develop`/`main`
  pushes skip the PR-only jobs natively. Auto-merge target branches:
  `AUTO_MERGE_TARGETS` in `factory.yml` (`develop main`).

## Review

PR review is out-of-band: CodeRabbit (installed as a GitHub App) reviews each
PR on GitHub and posts its findings as PR comments. The Factory does not wait
on it — nothing in `factory.yml` invokes it, and its status does not gate the
merge job. The Factory's own gates are deterministic triage (deny paths,
diff size) plus the full pipeline; CodeRabbit's comments are advisory signal
for whoever merges or reads a PR. Deleting the old OpenCode reviewer agents
also removed the Factory's dependence on the free `opencode` provider tier —
the `OPENCODE_CREDENTIAL` / `OPENCODE_API_KEY` secrets and the
`REVIEW_FAST_MODEL` / `REVIEW_STRONG_MODEL` repo variables are no longer used
by any workflow.

## How the factory tests itself

`scripts/factory.test.ts` is a structural drift guard, same root wiring
(`test:scripts` inside both `bun run test` and `bun run check`). It asserts:

- the merge job's `needs:` names every machine job (add a pipeline job
  without wiring it into the terminal graph and this fails),
- authorization in the merge job still checks head freshness and the
  `auto-merge` label,
- the deny-path regex in triage is intact,
- docs-only tiering still flows through `check`,
- the two former split workflows (`pipeline.yml`, `pr-review.yml`) are gone.

## Plan constraints (free + private repo)

GitHub branch protection ("required status checks", PR-only enforcement) is a
paid feature for private repositories — the API returns 403 here. Consequences:

- **PR-only pushes are convention, not enforcement.** The merge gate makes
  merges safe (no auto-merge until triage clears the diff and the full
  pipeline passes), but a direct push to `main`/`develop` is not rejected by
  GitHub itself.
- To get real enforcement, either make the repository public, move to a paid
  plan, or add a push-guard workflow that reverts non-PR commits (planned).

The script below works if either of the first two options applies:

```bash
# Idempotent: squash-only merges, auto-merge flag, required checks, admins
# included, linear history. Fails with 403 on free+private.
bash scripts/set-branch-protection.sh
```

## Force a human merge

Add a deny-path file, raise the diff above `MAX_DIFF_LINES`, or simply remove
the `auto-merge` label before the merge job fires: it stays green but reports
the refusal and does not merge. For a permanent change to policy, edit
`.github/workflows/factory.yml` (that edit itself always needs a human,
because `.github/**` is a deny path).
