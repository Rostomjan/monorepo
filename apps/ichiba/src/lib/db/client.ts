import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

// Lazy singletons: importing this module must never connect (Next prerenders
// routes at build time with no DATABASE_URL). First query throws a clear
// error instead of a driver connection failure.
let _db: PostgresJsDatabase<typeof schema> | null = null;
let _dbRead: PostgresJsDatabase<typeof schema> | null = null;

function databaseUrl(): string {
  // Vercel's Neon integration names it POSTGRES_URL; standalone Neon docs
  // and local dev use DATABASE_URL. Either works.
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL (or POSTGRES_URL) is not set. Cloud (no Docker): create Neon from the Vercel project (Storage tab) or console.neon.tech, then pull its pooled URL into apps/ichiba/.env.local as DATABASE_URL. Prod/preview get it automatically from Vercel env.",
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

// Read path. Points at a Neon read replica when REPLICA_URL is set,
// otherwise falls back to the primary. Writes (checkout transaction) and
// read-your-write flows (post-checkout /orders) always use db().
export function dbRead(): PostgresJsDatabase<typeof schema> {
  const replica = process.env.REPLICA_URL;
  if (!replica) return db();
  if (!_dbRead) {
    _dbRead = drizzle(postgres(replica, { max: 5 }), { schema });
  }
  return _dbRead;
}
