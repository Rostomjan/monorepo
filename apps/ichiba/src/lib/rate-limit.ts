// Free-tier rate limiter replacing the nginx `write_zone` (100 req/min per IP).
// Uses Upstash Redis REST API directly (no new deps). Vercel Marketplace
// names them KV_REST_API_URL + KV_REST_API_TOKEN (standalone Upstash docs use
// UPSTASH_REDIS_REST_URL/TOKEN — both accepted). When unset (local dev, CI),
// it no-ops to open — same as the Sentry DSN pattern.
export async function checkWriteRateLimit(req: Request, limit = 100, windowS = 60): Promise<boolean> {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return true;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anon";
  const key = `ichiba:rl:write:${ip}`;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(windowS), "NX"],
      ]),
    });
    if (!res.ok) return true;
    const data = (await res.json()) as Array<{ result?: number }>;
    const count = data[0]?.result ?? 0;
    return count <= limit;
  } catch {
    return true;
  }
}
