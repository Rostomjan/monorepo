import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: 10,
  duration: "30s",
  thresholds: { http_req_duration: ["p(95)<800"] },
  cloud: {
    projectID: 8483856,
    name: "ichiba-search",
  },
};

const BASE = __ENV.BASE_URL ?? "http://localhost:3003";

export default function () {
  const res = http.get(`${BASE}/?q=Matcha`);
  check(res, { "200": (r) => r.status === 200 });
}
