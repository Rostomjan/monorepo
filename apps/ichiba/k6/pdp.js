import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: 20,
  duration: "30s",
  thresholds: { http_req_duration: ["p(95)<300"] },
};

const BASE = __ENV.BASE_URL ?? "http://localhost:3003";

export default function () {
  const res = http.get(`${BASE}/products/shop-1-p1`);
  check(res, { "200": (r) => r.status === 200 });
}
