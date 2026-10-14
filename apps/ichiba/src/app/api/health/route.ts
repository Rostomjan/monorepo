import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

// Liveness + catalog readiness. Reports which relations exist so a missing
// migration (e.g. Neon provisioned but db:migrate never ran) is a 10-second
// diagnosis instead of a 500 mystery on `/`.
export async function GET() {
  const status: { ok: boolean; app: string; stage: number; database: string; relations: Record<string, boolean> } = {
    ok: true,
    app: "ichiba",
    stage: 3,
    database: "unknown",
    relations: {},
  };
  try {
    const rows = await db().execute(
      sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('shops', 'products', 'orders', 'order_items')`,
    );
    const found = new Set((rows as unknown as Array<{ tablename: string }>).map((r) => r.tablename));
    status.relations = {
      shops: found.has("shops"),
      products: found.has("products"),
      orders: found.has("orders"),
      order_items: found.has("order_items"),
    };
    status.database =
      status.relations.shops && status.relations.products && status.relations.orders && status.relations.order_items
        ? "ready"
        : "missing-migrations";
    if (status.database !== "ready") status.ok = false;
  } catch (e) {
    status.ok = false;
    status.database = e instanceof Error ? e.message.slice(0, 160) : "unreachable";
  }
  // Never cache health: it drives LB failover decisions (mirrors nginx rule).
  return Response.json(status, {
    status: status.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
