# Monorepo

Microfrontend foundation: independent `apps/*` sharing `packages/*`.

## Quickstart

```bash
bun install
bun run dev        # everything
bun run check      # lint + types + tests + build
docker compose up --build  # web + api locally
```

## Scaffold

```bash
bun run new web my-site
bun run new api my-service
bun run new mobile my-app
bun run new package my-lib
```

## Docs

- `docs/ARCHITECTURE.md` — what lives where
- `docs/ADDING_APP.md` — bootstrap new sites, services, apps
- `docs/OPERATIONS.md` — test, deploy, update dependencies
