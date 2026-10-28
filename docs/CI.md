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
| Playwright ×3 (chat, kanji) | `apps/chat`, `apps/kanji`, `apps/api`, `apps/e2e` |
| Ichiba e2e | `apps/ichiba`, `apps/e2e` |
| — (no heavy tier) | `apps/kotoba`, `apps/docs`: the lint/type/test/build tier covers them fully |

Untouched surfaces skip the need for their job (e.g. a `kotoba`-only PR runs
only the lint/type/test/build tier). The selector always executes
`scripts/tier-select.ts` from a squash-merged ref (`origin/main`, falling
back to `origin/develop` until the next promotion; the full graph before
the module first lands) — never the PR head, so a PR cannot reroute its
own gates by editing the selectors. Pushes to `develop`/`main` bypass the
selectors and run the entire suite; note `deploy-prod` itself gates only
on the e2e legs (docker/ichiba failures don't block promotion — a possible
follow-up to tighten). If a tier wrongly
skips, widen the app list in `scripts/tier-select.ts` — never in the YAML.
`.github/**`-only diffs are check-only by design (machine-reviewed); empty
diffs run `check` and nothing heavy; everything unmapped runs the heaviest
tier rather than silently skipping.

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
inputs; a changed input re-runs). Accepted risk: `TURBO_TOKEN` is exported
inside pipeline jobs, so PR code running under `bun run check` could read
it; the token is scoped to cache read/write only (no repo content access).
Rotate it from Vercel's settings when needed.

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
