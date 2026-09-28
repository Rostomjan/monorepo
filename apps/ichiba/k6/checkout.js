import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: 5,
  duration: "30s",
  thresholds: { http_req_failed: ["rate<0.001"] },
  cloud: {
    projectID: 8483856,
    name: "ichiba-checkout",
  },
};

const BASE = __ENV.BASE_URL ?? "http://localhost:3003";

export default function () {
  const payload = JSON.stringify({ items: [{ productId: "shop-1-p1", qty: 1 }] });
  const res = http.post(`${BASE}/api/checkout`, payload, { headers: { "Content-Type": "application/json" } });
  check(res, { "200": (r) => r.status === 200 });
}
