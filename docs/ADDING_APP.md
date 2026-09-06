# Adding apps and packages

```bash
bun run new web my-site       # apps/my-site (Next + @repo/ui)
bun run new api my-service    # apps/my-service (Hono + Bun)
bun run new mobile my-app     # apps/my-app (Expo + @repo/tokens)
bun run new package my-lib    # packages/my-lib (@repo/my-lib)
bun install
bun run dev --filter my-site  # or: bun run dev --filter my-service
```

Templates live in `templates/`, generator in `scripts/scaffold.ts`.
Placeholders `__NAME__` / `__SCOPE__` are replaced automatically.

Checklist for a new deployable:

- Web: set Vercel project Root Directory to `apps/<name>`, add env (`NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_API_URL`).
- API: `docker build -f apps/<name>/Dockerfile -t <name> .`, expose `PORT`, add `/healthz` check.
- E2E: point `BASE_URL` at the new site or duplicate `apps/e2e` per site when flows diverge.
