# Kanji app content pipeline

Authored content is the source of truth. The database is a build artifact.

## Flow

```
upstream datasets --ingest--> content/upstream/ (regenerable, gitignored)
authoring        --by hand--> content/level-N/*.json + sources.json (committed)
content files    --build-seed--> packages/backend/convex/kanjiSeedData.ts (committed, generated)
seed data        --seed--> Convex deployment (needs CONVEX_URL)
```

## Commands (run from `apps/kanji`)

- `bun scripts/ingest.ts [--refresh]` — download open datasets, write extracts
  under `content/upstream/`. Refuses any host outside the open-source
  allowlist (see `scripts/lib/parse.ts`).
- `bun scripts/build-seed.ts` — validate content files, regenerate the
  Convex seed-data module. Fails loudly on any invalid item.
- `bun scripts/seed.ts` — clear + reseed the deployment (`CONVEX_URL`
  required). Delete + reseed reproduces the tables exactly.
- `bun test` — transform/validation unit tests.

## Authoring rules (locked content pipeline)

- One file per level per type: `content/level-N/{radicals,kanji,vocab}.json`.
- Every item carries the locked field set (glyph, type, level, meanings,
  readings, mnemonic, components, audioRef, examples, sources, shipped).
- Every CC-derived field carries its source tag (see `sources.json`).
- Only `shipped: true` items reach the deployment; un-QA'd levels stay out.
- Never ingest RTK keywords/stories, KanjiDamage, Koohii stories, Kanshudo,
  or WaniKani content. The ingest allowlist enforces this mechanically.
