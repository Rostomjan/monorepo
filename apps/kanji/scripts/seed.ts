#!/usr/bin/env bun
/**
 * Seed the Convex deployment from the generated seed-data module.
 * Requires CONVEX_URL (points at dev or prod deployment). Run after push
 * or locally with `convex dev` running: CONVEX_URL=http://127.0.0.1:3210 bun scripts/seed.ts
 *
 * Reseed semantics: clear + insert, so delete + reseed gives identical tables.
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "@repo/backend/convex/_generated/api";

const url = process.env.CONVEX_URL;
if (!url) {
  console.error("CONVEX_URL is not set — nothing seeded.");
  console.error("Deploy first (push to develop/main auto-deploys Convex), then re-run with CONVEX_URL.");
  process.exit(1);
}
const key = process.env.SEED_KEY;
if (!key) {
  console.error("SEED_KEY is not set — nothing seeded.");
  console.error("Set SEED_KEY to the target deployment's seed key (never commit it).");
  process.exit(1);
}

const client = new ConvexHttpClient(url);
const cleared = await client.mutation(api.kanjiSeed.clearKanji, { key });
console.log(`cleared: ${JSON.stringify(cleared)}`);
const seeded = await client.mutation(api.kanjiSeed.seedKanji, { key });
console.log(`seeded: ${JSON.stringify(seeded)}`);
