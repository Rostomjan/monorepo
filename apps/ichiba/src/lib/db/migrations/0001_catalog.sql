-- 0001: catalog baseline (Stage 3). Idempotent — safe to re-run.
-- Trigram index powers typo-tolerant product search (replaces the naive
-- substring scan); btree on shop_id serves shop filters + grouping.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS shops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES shops(id),
  name TEXT NOT NULL,
  price_yen INTEGER NOT NULL,
  stock INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS products_shop_id_idx ON products (shop_id);
CREATE INDEX IF NOT EXISTS products_name_trgm_idx ON products USING gin (name gin_trgm_ops);
