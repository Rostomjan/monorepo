# Backend twins: TS + Python + Go (learning lab)

Ichiba has **multiple implementations of the same backend**, languages side
by side, so every piece of backend functionality can be written — and
*compared* — several times:

| | `apps/ichiba` (canonical) | `apps/ichiba-py` (learning twin) | `apps/ichiba-go` (learning twin) |
|---|---|---|---|
| Runtime | Next.js route handlers + RSC | Django 5 + DRF, gunicorn | net/http + pgx, stdlib mux |
| Language | TypeScript (bun) | Python ≥ 3.12 (uv) | Go (go modules) |
| Port | 3003 | 3021 | 3022 |
| DB access | drizzle ORM | Django ORM (unmanaged) | raw SQL via pgx (unmanaged) |
| Tests | bun test + Playwright | pytest (parity + contract) | go test (parity + contract) |
| Scope | everything | full contract | phase 1: reads (health, products, shops) |

The comparison is the point: Django hands you an ORM, router, serializers
and a test client; Next hides reads behind RSC and `unstable_cache`; Go
hands you the standard library and ~300 lines you write yourself. No fat
Go web framework on purpose — Gin/Echo would flatten the comparison.

## Rules (definition of done)

1. **No backend contract change is complete until implemented in every
   backend that serves it.** Same paths, same JSON shapes, same error
   strings — the shared contract checker asserts them byte-for-byte.
2. **Schema is owned by `apps/ichiba`** (drizzle: `src/lib/db/migrations/*.sql`,
   run via `bun run db:migrate`). All twins point at the same Postgres.
   Django models are `managed = False`; the Go twin executes the same SQL
   files verbatim in tests. No twin ever adds tables. Never add tables
   from a twin side.
3. Cross-language fixtures must stay identical: `generateCatalog(42)` in
   TS, `generate_catalog()` in Python and `generateCatalog(40, 30, 42)` in
   Go produce byte-identical ids, names and prices for the same seed
   (the golden truth is `apps/ichiba-go/testdata/catalog-42.json`,
   regenerated from TS with a `bun -e` one-liner against
   `apps/ichiba/src/lib/catalog.ts`; python and Go tests lock their ports
   to it, Go bit-for-bit down to the RNG doubles).

## Enforcing parity

- **Unit parity**: `apps/ichiba-py/tests` mirrors `apps/ichiba/src/lib/*.test.ts`
  scenario-for-scenario (pure split/merge logic, fixture-backed, no DB).
- **DB contract tests**: `apps/ichiba-py/tests/test_db_api.py` and
  `apps/ichiba-go/db_test.go` hit the endpoints (Django test client /
  httptest) against a real Postgres. Both self-skip without `DATABASE_URL`.
- **Live contract check** (against any running backend):

  ```bash
  python3 scripts/contract.py http://localhost:3022   # Go backend
  uv run scripts/contract.py http://localhost:3021    # Python backend
  uv run scripts/contract.py http://localhost:3003    # TS backend
  ```

  The script is stdlib-only. It asserts statuses, shapes and exact error
  strings (`invalid json`, `items must be a non-empty array (max 50)`,
  `unknown product: X`, `insufficient stock for X`, `too many requests`).
  `--reads-only` scopes it to the read contract (phase-1 backends);
  `--write` additionally exercises a real checkout.
- **CI**: the `check` job runs every workspace (Go + Python DB tests
  self-skip without a database); the `ichiba-e2e` job runs the python
  suite **and** the Go live contract check **with** the same Postgres
  service the Playwright flow uses.

## API surface (contract)

Same `/api/*` paths served by the TS route handlers, plus service-twin-only
endpoints for things TS does over RSC:

| Path | TS | Python | Go | Notes |
|---|---|---|---|---|
| `GET /api/health` | route.ts | HealthView | handleHealth | identical JSON, 503 when unready, `Cache-Control: no-store` |
| `POST /api/checkout` | route.ts | CheckoutView | — (phase 2) | atomic per-shop split, row locks, error strings |
| `GET /api/orders` | route.ts | OrdersView | — (phase 2) | guest until Clerk lands |
| `GET /api/products` | RSC only (`queryProducts`) | ProductsView | handleProducts | exposed as HTTP to make twins real services (q, shopId, sort, page, perPage, trigram search) |
| `GET /api/shops` | RSC only | ShopsView | handleShops | same reason |

## Intentional divergences (documented, not drift)

- **Clerk**: TS resolves `auth()` per request with `"guest"` fallback;
  the twins see every request as `"guest"` (no Clerk integration yet).
- **Caching**: TS uses Next `unstable_cache` (300s entities / 60s query);
  python has a ~15-line `ttl_cache` with the same staleness contract —
  the learning point is what a framework gives you invisibly. The Go twin
  needs none for phase 1 (its HTTP reads are re-cached at the TS dispatch
  layer, per backend key).
- **Cart persistence**: TS carts live in cookies via Server Actions
  (`cart-store.ts`); the twins have no cookie layer, so only the pure cart
  functions are ported (python: `ichibaapi/cart.py`).

## Flag-gated backend switch (phase 1)

Phase 1 switches the catalog **listing** reads only: `queryProducts` and
`listShops` in `apps/ichiba/src/lib/catalog.ts` are dispatched through
`backend.ts`'s remote-backend registry — a REGISTRY, not conditionals, so
adding a twin to the frontend is one entry (see the plug-in recipe below).
A backend wins only when BOTH of its gates pass:

1. its flag (Vercel Flags, dashboard-managed, evaluated per request via
   `@flags-sdk/vercel`) — `ichiba-python-backend`, `ichiba-go-backend`;
2. its base-url env points at a running service — `ICHIBA_API_URL`
   (:3021), `ICHIBA_GO_API_URL` (:3022).

Registry order is priority: with several flags enabled at once, the
earliest fully-enabled entry computes the page. Whichever backend runs,
listing semantics are locked byte-for-byte by the parity/contract tests,
so the flag changes **who computes** the page, not what it shows. Cache
keys carry the backend (`ichiba-query` vs `ichiba-query/python` vs
`ichiba-query/go`), so a flip mid-flight can never mix cached results of
two implementations. A failing twin (down, slow, 500, non-JSON) is caught
in the RSC path after a 3s fetch budget and falls back to the drizzle
path. All non-listing reads (`getProduct`/`getShop`/`getProducts` — the
twins have no such HTTP endpoints yet) and all writes (cart Server
Actions, `/api/checkout`, `/api/orders`) stay canonical; make them
flag-switchable only after the twins gain those endpoints, in every
backend, as a new contract change.

**Dev-only escape hatch** (`apps/ichiba/src/lib/backend.ts`): flags are
dashboard-managed, so local development cannot flip them. Set
`ICHIBA_FORCE_BACKEND=python|go` (dev only — refused outright when
`NODE_ENV=production`) to bypass the FLAG gate and watch the same page be
computed by another language locally:

```bash
ICHIBA_FORCE_BACKEND=go ICHIBA_GO_API_URL=http://localhost:3022 \
  bun run dev --filter ichiba
```

The base-url gate still applies — a forced backend whose env is missing
warns and serves the canonical path, and killing the twin mid-render
demonstrates the 3s RSC fallback live (grep the dev log for
`catalog read failed; falling back`).

Tooling: the Flags SDK (`flags`) with the Vercel adapter
(`@flags-sdk/vercel`) — no `/api` contract changes needed. Local control:
`vercel link` in `apps/ichiba` + `vercel env pull` (OIDC), then flip the
flag in the Vercel dashboard (or the Toolbar's Flags Explorer, wired via
the `/.well-known/vercel/flags` discovery endpoint). Unconfigured (plain
`bun run dev`, docker) defaults to the canonical path.

## Adding a new backend twin (the plug-in recipe)

The architecture makes a twin additive. Checklist, in order:

1. **Scaffold `apps/<name>`** with a `package.json` task shim (`dev`,
   `build`, `start`, `lint`, `type-check`, `test`, `clean`, `contract`)
   and a package-level `turbo.json` (`"extends": ["//"]`) declaring the
   language's real inputs/outputs. Pick a free port (port map below).
2. **Port the fixture first** (`generateCatalog` + `mulberry32`), before
   any HTTP code — seeded-RNG semantics are the fiddly part. Lock it to
   `apps/ichiba-go/../ichiba`'s golden (`testdata/catalog-42.json`,
   regenerate with `bun -e` against `apps/ichiba/src/lib/catalog.ts`).
3. **Implement the phase-1 read contract** (`/api/health`,
   `/api/products`, `/api/shops`) with the same statuses, shapes and
   error strings. Never own the schema; read the drizzle migrations.
4. **DB tests** that self-skip without `DATABASE_URL`, replay the same
   migrations, seed from the fixture, and assert the shapes
   (see `apps/ichiba-go/db_test.go` for the pattern).
5. **Contract check**: `python3 scripts/contract.py --reads-only
   http://localhost:<port>` must pass against a running instance
   (`bunx turbo contract --filter ichiba-go` wraps it).
6. **Wire the frontend (one registry entry)**: add the id+env to
   `REMOTE_BACKENDS` in `apps/ichiba/src/lib/backend.ts`, a flag
   declaration in `flags.ts`, an evaluator entry in `flags-runtime.ts`,
   and tests. The dispatch sites need no edits.
7. **Infra**: docker-compose service (own profile), Dockerfile, a
   `setup-<lang>` step in the Factory's `check` + `ichiba-e2e` jobs, the
   tier-select mapping (`scripts/tier-select.ts` + its tests), and knip:
   add the workspace to knip.json's top-level `ignore` (like
   `apps/ichiba-py`) plus the task-shim's toolchain binaries to
   `ignoreBinaries` — knip is a TS/JS analyzer and the shim invokes tools
   provisioned by CI setup steps, not npm deps.
8. **Docs**: add the twin to the table above and the port map.

Removing a twin is the same list in reverse; the registry entry and the
flag are all that hold the frontend side together.

## Tooling

- **Python side is uv-governed** (like bun for JS: one lockfile `uv.lock`,
  one venv per app). The `package.json` inside `apps/ichiba-py` is a thin
  shim so Turborepo can run the same task names:

  ```bash
  bun run dev --filter ichiba-py          # runserver :3021
  bun run test --filter ichiba-py         # pytest
  bun run lint --filter ichiba-py         # ruff
  bun run type-check --filter ichiba-py   # mypy (+ django-stubs)
  ```

  Equivalent direct commands: `cd apps/ichiba-py && uv sync && uv run pytest`.

- **Go side is go-modules-governed** (`go.mod`/`go.sum` committed, one
  module). Same shim trick; `go` must be on PATH:

  ```bash
  bun run dev --filter ichiba-go          # go run . :3022
  bun run test --filter ichiba-go         # go test ./...
  bun run lint --filter ichiba-go         # go vet + gofmt check
  bun run type-check --filter ichiba-go   # go vet
  ```

Local dev database (shared by all backends): `docker compose up db`, then
`export DATABASE_URL=postgresql://ichiba:ichiba@localhost:5432/ichiba`.

Containers: `docker compose --profile python up ichiba-py` and
`docker compose --profile go up ichiba-go` (fresh test branch → for full
catalog data run `bun run db:seed` from `apps/ichiba` once against the
shared `db`).

## Port map

3000 chat · 3001 api · 3002 docs · 3003 ichiba (TS) · 3021 ichiba-py ·
3022 ichiba-go · 3004/3005 ichiba scale-lab replicas · 8080 gateway.
