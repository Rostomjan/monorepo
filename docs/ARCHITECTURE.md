# Architecture

Build-time microfrontends: each site in `apps/*` deploys independently and shares code via `packages/*`.

- `apps/chat` — main Next.js site (port 3000, Vercel or Docker)
- `apps/docs` — second Next.js site proving the pattern (port 3002, copy it for new sites)
- `apps/api` — Hono + Bun service (port 3001, Docker/Fly)
- `apps/e2e` — Playwright tests against `chat`
- `apps/mobile` — created via `bun run new mobile <name>` (Expo, shares `@repo/tokens`)
- `packages/ui` — shared React components (import as `@repo/ui`)
- `packages/tokens` — design tokens usable from chat and native
- `packages/backend` — Convex functions and schema
- `packages/tailwind-config`, `packages/typescript-config`, `packages/eslint-config` — shared tooling

Rules:

- Apps never import from each other. Shared code goes in `packages/*`.
- Keep `packages/ui` presentational. App-specific logic stays in the app.
- New project? `bun run new <web|api|mobile|package> <name>`, then `bun install`.
