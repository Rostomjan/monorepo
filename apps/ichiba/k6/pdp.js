import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 20,
  duration: "30s",
  // Calibrated against Vercel prod baseline (p95 ~560ms incl. cold starts).
  // Local `next dev` runs slower — use smoke flags there
  // (--vus 1 --iterations 2), enforce this budget only against preview/prod.
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800"],
  },
  cloud: {
    projectID: 8483856,
    name: "ichiba-pdp",
  },
};

const BASE = __ENV.BASE_URL ?? "http://localhost:3003";
// See search.js: Vercel Deployment Protection bypass for preview/prod runs.
const BYPASS = __ENV.VERCEL_BYPASS ?? "";
const HEADERS = BYPASS ? { "x-vercel-protection-bypass": BYPASS } : {};

// Catalog ids are deterministic (shop-N-pM, 40 shops x 30 products).
// Spread reads across the catalog instead of hammering one page.
function randomProductId() {
  const shop = 1 + Math.floor(Math.random() * 40);
  const p = 1 + Math.floor(Math.random() * 30);
  return `shop-${shop}-p${p}`;
}

export default function () {
  const res = http.get(`${BASE}/products/${randomProductId()}`, { headers: HEADERS });
  check(res, { "200": (r) => r.status === 200 });
  sleep(1);
}
