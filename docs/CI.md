# CI / Factory

Everything CI lives in `.github/workflows/factory.yml` — no other workflow
owns PR checks or deploys (only `update-deps.yml` housekeeping besides). The
workflow is one job graph; humans click only for deny paths.

## Graph

```
PR  -> Changes -> Triage ┐                ┌-> Lint/Types/Tests/Build -> docker -> e2e x3 -> \
       (docs-only, tiers)├-> Review fast ─┤-> Ichiba e2e (postgres svc) -------------------> Merge gate
                         └-> Review strong┘                                                 /
push -> same graph minus PR-only jobs (triage/reviews/merge) -> deploys
```

- Docs-only PRs (`.md`/`docs/**` only): everything between detect and merge
  skips through the job graph; reviewers still run.
## Affected tiers

Selection lives in `scripts/tier-select.ts` (single source; table-tested in
`scripts/factory.test.ts`). Coarse on purpose — ANY change under `packages/`,
`scripts/`, or root config/lock files counts as shared and enables every
expensive tier, so adding a new shared package needs no selector edits:

| Job | Apps that select it |
| --- | --- |
| Docker builds (api, chat) | `apps/api`, `apps/chat` (testable via docker) |
| Playwright ×3 (chat, kanji) | `apps/chat`, `apps/kanji`, `apps/api` |
| Ichiba e2e | `apps/ichiba` |

Untouched surfaces skip the need for their job (e.g. a `kotoba`-only PR runs
only the lint/type/test/build tier). Pushes to `develop`/`main` bypass the
selectors and always run the full suite before deploys. If a tier wrongly
skips, widen the app list in `scripts/tier-select.ts` — never in the YAML.

## Turbo remote cache

`check` reuses turbo's local cache from Actions' cache (namespaced by
`bun.lock`). To also share artifacts between local runs, CI, and agent
machines, set the optional credentials — turbo falls back to local-only
when absent:

```bash
# Vercel account -> Settings -> Tokens -> create (scope to the team)
gh secret set TURBO_TOKEN
gh variable set TURBO_TEAM
```

The goal is speed, not correctness: green checks mean the work re-ran or
hit cache — cache restoration never relaxes validation (turbo hashes task
inputs; a changed input re-runs).

## Reviewers

OpenCode agents (`opencode.jsonc`: `review-fast`, `review-strong`) run on
free provider models keyless; swap via repo variables
(`REVIEW_FAST_MODEL` / `REVIEW_STRONG_MODEL`). Their verdict lands as
labels (`review-*:approved|changes`); the merge gate requires fresh
approvals from both on the exact head being merged. A reviewer job that
*crashes* is machinery failure (red) — the merge gate does not run.

## Maintenance rules

- Structural edits to the graph fail `scripts/factory.test.ts` loudly:
  never disconnect a job from `needs:` undefined; every expensive job must
  keep its affected selector; the deny regex and authorization strings are
  drift-guarded.
- `main` is the default branch: PR-trigger evaluation reads `main`'s copy
  of workflows, so changes to `factory.yml` take effect for future PRs
  only after the change lands on `main` (via a `develop -> main`
  promotion PR or a `main`-targeted auto-merge).
- PR-only-push enforcement needs branch protection, which the plan does
  not offer (see `docs/PR-GATE.md`, "Plan constraints").
