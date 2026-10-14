import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

// 409 (insufficient stock) is a legitimate business outcome under load, not
// a failure — thin-stock products can sell out mid-run. Threshold on
// unexpected outcomes only (5xx, 4xx other than 409, network errors).
const unexpected = new Rate("checkout_unexpected");

export const options = {
  vus: 5,
  duration: "30s",
  thresholds: {
    checkout_unexpected: ["rate<0.01"],
    http_req_duration: ["p(95)<2000"],
  },
  cloud: {
    projectID: 8483856,
    name: "ichiba-checkout",
  },
};

const BASE = __ENV.BASE_URL ?? "http://localhost:3003";
// See search.js: Vercel Deployment Protection bypass for preview/prod runs.
const BYPASS = __ENV.VERCEL_BYPASS ?? "";

// WARNING: destructive — every iteration mints a real order and decrements
// real stock. Preview shares the production Neon database (same DATABASE_URL
// value on both environments), so only run this against an env whose data
// you can throw away (local, or preview after Neon branching is set up).
function randomProductId() {
  const shop = 1 + Math.floor(Math.random() * 40);
  const p = 1 + Math.floor(Math.random() * 30);
  return `shop-${shop}-p${p}`;
}

export default function () {
  const payload = JSON.stringify({ items: [{ productId: randomProductId(), qty: 1 }] });
  const headers = { "Content-Type": "application/json" };
  if (BYPASS) headers["x-vercel-protection-bypass"] = BYPASS;
  const res = http.post(`${BASE}/api/checkout`, payload, { headers });
  const ok = check(res, {
    "200 or sold-out": (r) => r.status === 200 || r.status === 409,
  });
  unexpected.add(!ok);
  sleep(1);
}
