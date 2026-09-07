# AGENTS.md

Build-time microfrontend monorepo (Turborepo + Bun). Independent `apps/*` deploy on their own; shared code lives in `packages/*`. README and `docs/` are canonical — read them before guessing.

## Commands (Bun only, never npm)

- `bun install` — install all workspaces (`bun.lock` is the lockfile)
- `bun run dev` — all apps via turbo (persistent). Target one: `bun run dev --filter <name>`
- `bun run check` — the gate: lint + type-check + build, then unit tests
- `bun run lint` / `bun run type-check` / `bun run build`
- `bun run test` — unit tests only (`bun test`, colocated `*.test.ts`); **e2e is excluded**
- `bun run test:e2e` — Playwright in `apps/e2e` against `apps/chat`; needs browsers once: `bunx playwright install --with-deps` in `apps/e2e`
- `bun run knip` — prune unused exports/deps after large changes
- `bun run deps:lint` / `deps:fix` — syncpack version-consistency check / autofix

## Structure & boundaries

- Apps never import from each other. Cross-app code goes in `packages/*` and is consumed as `@repo/*` (pinned `workspace:*`).
- `packages/ui` — presentational React components only; app-specific logic stays in the app.
- `packages/backend` — Convex functions + schema, **not an app**. Convex auto-deploys from here on `develop` (dev) and `main` (prod).
- New project: `bun run new <web|api|mobile|package> <name>`, then `bun install`. Templates in `templates/`, generator `scripts/scaffold.ts`.
- `apps/docs` is the "copy me for a new site" reference (port 3002). Note: it uses a top-level `app/` dir for pages, unlike `apps/chat` which uses `src/app/`.

## Toolchain pins (do not bump)

This is the eslint 8 / Next 15 / Storybook 8 era, enforced by syncpack versionGroups:
- `eslint` pinned `^8.57.0`, `eslint-config-next` `15.0.4`, `eslint-plugin-react-hooks` `5.1.0`
- `storybook`/`@storybook/*` pinned `8.5.8` (v10 breaks `packages/ui` Icons export)
- The dep-update script `bun run update` rejects these automatically.

## React / CSS conventions

- React Compiler is on — skip manual `useMemo`/`useCallback`.
- Tailwind v4, global CSS file format + shadcn/ui.
- Next: content pages use MDX, prefer fetching in RSC (page can still be static), use `next/font` + `next/script`, `priority` on above-the-fold `next/image`, and keep RSC→child serialized props small.

## Env / secrets

- `.env*` files are gitignored. Convex uses `CONVEX_URL`/`CONVEX_DEPLOYMENT`/`NEXT_PUBLIC_CONVEX_URL`; chat→api uses `NEXT_PUBLIC_API_URL`; API uses `PORT`. Never commit keys.
- `gh` CLI is installed — prefer it for GitHub tasks.

## Docker / deploy

- Local: `docker compose up --build` (chat on 3000, api on 3001; api has `/healthz`).
- Chat/docs: one Vercel project per app, Root Directory `apps/<name>`. API: any Docker host, `PORT` env, `/healthz`.
