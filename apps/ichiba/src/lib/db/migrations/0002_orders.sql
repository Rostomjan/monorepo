-- 0002: orders (Stage 5, done early). Replaces the per-instance in-memory
-- ORDER_DB, which is incorrect on multi-instance/serverless deployments.
-- Idempotent — safe to re-run.
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  shop_name TEXT NOT NULL,
  total_yen INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price_yen INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  PRIMARY KEY (order_id, product_id)
);

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders (user_id);
