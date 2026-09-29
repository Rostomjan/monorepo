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
      sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('shops', 'products')`,
    );
    const found = new Set((rows as unknown as Array<{ tablename: string }>).map((r) => r.tablename));
    status.relations = { shops: found.has("shops"), products: found.has("products") };
    status.database = status.relations.shops && status.relations.products ? "ready" : "missing-migrations";
    if (status.database !== "ready") status.ok = false;
  } catch (e) {
    status.ok = false;
    status.database = e instanceof Error ? e.message.slice(0, 160) : "unreachable";
  }
  return Response.json(status, { status: status.ok ? 200 : 503 });
}
