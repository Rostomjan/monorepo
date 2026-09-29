import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

// Lazy singleton: importing this module must never connect (Next prerenders
// routes at build time with no DATABASE_URL). First query throws a clear
// error instead of a driver connection failure.
let _db: PostgresJsDatabase<typeof schema> | null = null;

function databaseUrl(): string {
  // Vercel's Neon integration names it POSTGRES_URL; standalone Neon docs
  // and local dev use DATABASE_URL. Either works.
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL (or POSTGRES_URL) is not set. Local: run the `db` service (`docker compose up db`) and export DATABASE_URL=postgresql://ichiba:ichiba@localhost:5432/ichiba. Prod: create Neon from the Vercel project (Storage tab) — env vars are added automatically.",
    );
  }
  return url;
}

export function db(): PostgresJsDatabase<typeof schema> {
  if (!_db) {
    _db = drizzle(postgres(databaseUrl(), { max: 5 }), { schema });
  }
  return _db;
}
