import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 10,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800"],
  },
  cloud: {
    projectID: 8483856,
    name: "ichiba-search",
  },
};

const BASE = __ENV.BASE_URL ?? "http://localhost:3003";
// Vercel Deployment Protection blocks unauthenticated traffic (even the
// health endpoint 302s). Create a "Protection Bypass for Automation" secret
// in Project Settings → Deployment Protection and pass it as VERCEL_BYPASS.
// Local runs don't need it.
const BYPASS = __ENV.VERCEL_BYPASS ?? "";
const HEADERS = BYPASS ? { "x-vercel-protection-bypass": BYPASS } : {};

const QUERIES = ["Matcha", "Kimono", "Tea Pot", "Lantern", "Knife Set"];

export default function () {
  const q = QUERIES[Math.floor(Math.random() * QUERIES.length)];
  const res = http.get(`${BASE}/?q=${encodeURIComponent(q)}`, { headers: HEADERS });
  check(res, { "200": (r) => r.status === 200 });
  sleep(1);
}
