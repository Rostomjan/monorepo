# Dual backend: TS + Python (learning lab)

Ichiba has **two implementations of the same backend**, languages side by
side, so every piece of backend functionality can be written — and
*compared* — twice:

| | `apps/ichiba` (canonical) | `apps/ichiba-py` (learning twin) |
|---|---|---|
| Runtime | Next.js route handlers + RSC | Django 5 + DRF, gunicorn |
| Language | TypeScript (bun) | Python ≥ 3.12 (uv) |
| Port | 3003 | 3021 |
| DB access | drizzle ORM | Django ORM (unmanaged) |
| Tests | bun test + Playwright | pytest (parity + contract) |

## Rules (definition of done)

1. **No backend contract change is complete until implemented in both
   backends.** Same paths, same JSON shapes, same error strings — contract
   tests assert them byte-for-byte.
2. **Schema is owned by `apps/ichiba`** (drizzle: `src/lib/db/migrations/*.sql`,
   run via `bun run db:migrate`). Both apps point at the same Postgres.
   Django models are `managed = False`: no Django migrations, no second
   schema owner. Never add tables from the Python side.
3. Cross-language fixtures must stay identical: `generateCatalog(42)` in
   TS and `generate_catalog()` in Python produce byte-identical ids, names
   and prices for the same seed (`tests/test_catalog_pure.py` locks this).

## Enforcing parity

- **Unit parity**: `apps/ichiba-py/tests` mirrors `apps/ichiba/src/lib/*.test.ts`
  scenario-for-scenario (pure split/merge logic, fixture-backed, no DB).
- **DB contract tests**: `tests/test_db_api.py` hits the HTTP endpoints
  through Django's test client against a real Postgres.
- **Live contract check** (against a running server, either language):

  ```bash
  cd apps/ichiba-py
  uv run scripts/contract.py http://localhost:3021   # Python backend
  uv run scripts/contract.py http://localhost:3003   # TS backend
  ```

  The script asserts statuses, shapes and exact error strings
  (`invalid json`, `items must be a non-empty array (max 50)`,
  `unknown product: X`, `insufficient stock for X`, `too many requests`).
- **CI**: the `check` job runs the Python workspace via uv (DB tests
  self-skip without a database); the `ichiba-e2e` job runs the full suite
  **with** the same Postgres service the Playwright flow uses.

## API surface (contract)

Same `/api/*` paths served by the TS route handlers, plus two
service-(django)-only endpoints for things TS does over RSC:

| Path | TS | Python | Notes |
|---|---|---|---|
| `GET /api/health` | route.ts | HealthView | identical JSON, 503 when unready, `Cache-Control: no-store` |
| `POST /api/checkout` | route.ts | CheckoutView | atomic per-shop split, row locks, error strings |
| `GET /api/orders` | route.ts | OrdersView | guest until Clerk lands |
| `GET /api/products` | RSC only (`queryProducts`) | ProductsView | exposed as HTTP to make the twin a real service (q, shopId, sort, page, perPage, trigram search) |
| `GET /api/shops` | RSC only | ShopsView | same reason |

## Intentional divergences (documented, not drift)

- **Clerk**: TS resolves `auth()` per request with `"guest"` fallback;
  Python sees every request as `"guest"` (no Clerk integration yet).
- **Caching**: TS uses Next `unstable_cache` (300s entities / 60s query);
  Python has a ~15-line `ttl_cache` with the same staleness contract —
  the learning point is what a framework gives you invisibly.
- **Cart persistence**: TS carts live in cookies via Server Actions
  (`cart-store.ts`); the Python service has no cookie layer, so only the
  pure cart functions are ported (`ichibaapi/cart.py`).

## Tooling

Python side is **uv-governed** (like bun for JS: one lockfile `uv.lock`,
one venv per app). The `package.json` inside `apps/ichiba-py` is a thin
shim so Turborepo can run the same task names:

```bash
bun run dev --filter ichiba-py          # runserver :3021
bun run test --filter ichiba-py         # pytest
bun run lint --filter ichiba-py         # ruff
bun run type-check --filter ichiba-py   # mypy (+ django-stubs)
```

Equivalent direct commands: `cd apps/ichiba-py && uv sync && uv run pytest`.

Local dev database (shared with TS): `docker compose up db`, then
`export DATABASE_URL=postgresql://ichiba:ichiba@localhost:5432/ichiba`.

Container: `docker compose --profile python up ichiba-py` (fresh test
branch → for full catalog data run `bun run db:seed` from `apps/ichiba`
once against the shared `db`).

## Port map

3000 chat · 3001 api · 3002 docs · 3003 ichiba (TS) · 3021 ichiba-py ·
3004/3005 ichiba scale-lab replicas · 8080 gateway.
