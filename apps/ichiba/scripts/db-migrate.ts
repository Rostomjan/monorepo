#!/usr/bin/env bun
// Applies SQL migrations in src/lib/db/migrations (idempotent *.sql files,
// run in filename order). Usage: DATABASE_URL=... bun scripts/db-migrate.ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const dir = new URL("../src/lib/db/migrations/", import.meta.url).pathname;
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();
if (files.length === 0) {
  console.error("No migration files found.");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
for (const file of files) {
  await sql.unsafe(readFileSync(join(dir, file), "utf8"));
  console.log(`applied ${file}`);
}
await sql.end();
