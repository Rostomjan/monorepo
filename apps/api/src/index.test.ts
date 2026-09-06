import { describe, expect, test } from "bun:test";
import { app } from "./index";

describe("api", () => {
  test("GET / returns ok", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ name: "api", status: "ok" });
  });

  test("GET /healthz returns ok", async () => {
    const res = await app.request("/healthz");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok" });
  });

  test("GET /api/hello greets by name", async () => {
    const res = await app.request("/api/hello?name=monorepo");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: "Hello, monorepo!" });
  });
});
