# Operations

## Commands

```bash
bun install            # install all workspaces
bun run dev            # all apps (turbo persistent)
bun run build          # all builds with cache
bun run lint           # eslint per package
bun run type-check     # tsc per package
bun run test           # unit tests only (e2e excluded, needs browsers)
bun run test:e2e        # playwright via apps/e2e (installs nothing, needs browsers)
bun run check          # lint + type-check + test + build
bun run knip           # unused exports/deps
bun run deps:lint      # syncpack version consistency
bun run deps:fix       # autofix version drift
```

## Testing

- Unit: `bun test` colocated (`*.test.ts`). API and tokens have examples. `bun run test` excludes e2e.
- E2E: `bun run test:e2e` or `cd apps/e2e && bun run test` (Playwright, spins up `apps/chat`). Browsers: `bunx playwright install --with-deps` in `apps/e2e`.
- CI runs lint, types, unit, build, syncpack, knip, docker builds, then Playwright.

## Deployment

- Chat/docs: Vercel Git integration, one project per app, Root Directory `apps/<name>`. Docker image available via `apps/chat/Dockerfile`.
- API: any Docker host (`apps/api/Dockerfile`), `PORT` env, `/healthz` probe. Local: `docker compose up --build`.
- Convex: auto-deploys from `packages/backend` on `develop` (dev) and `main` (prod) via deploy keys.

## Dependencies

- Weekly: `.github/workflows/update-deps.yml` runs `bun run update`, verifies with `bun run check`, opens a PR (from the `DEP_UPDATE_TOKEN` secret — a `GITHUB_TOKEN`-created PR never triggers the Factory review/automerge pipeline).
- Manual: `bun run update:check` to preview, `bun run update` to apply, `bun install`, `bun run check`.
- Keep `react`, `next`, `typescript`, `eslint`, `tailwindcss` aligned: `bun run deps:lint`, fix with `bun run deps:fix`.
- Prune dead code after big changes: `bun run knip`.

## PR gate

All pushes land via PR. Deterministic triage (deny paths, diff size) plus the
pipeline decide auto-merge; CodeRabbit reviews PRs out-of-band on GitHub. The
rest waits for a human. Policy and setup: `docs/PR-GATE.md`.
