import { describe, expect, test } from "bun:test";
import { app } from "./index";

describe("__NAME__", () => {
  test("GET / returns ok", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
  });

  test("GET /healthz returns ok", async () => {
    const res = await app.request("/healthz");
    expect(res.status).toBe(200);
  });
});
