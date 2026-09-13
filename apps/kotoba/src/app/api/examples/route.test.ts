import { afterEach, describe, expect, test } from "bun:test";
import { POST, parseExamples } from "./route";

const origFetch = globalThis.fetch;
const origKey = process.env.GOOGLE_API_KEY;

afterEach(() => {
  globalThis.fetch = origFetch;
  if (origKey === undefined) delete process.env.GOOGLE_API_KEY;
  else process.env.GOOGLE_API_KEY = origKey;
});

describe("POST /api/examples", () => {
  test("surfaces upstream provider error instead of opaque 502", async () => {
    process.env.GOOGLE_API_KEY = "test-key";
    globalThis.fetch = (async () =>
      new Response("API_KEY_INVALID", { status: 400, headers: { "Content-Type": "text/plain" } })) as unknown as typeof fetch;
    const res = await POST(new Request("http://localhost/api/examples", { method: "POST", body: JSON.stringify({ surface: "断食" }) }));
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error?: string; providerStatus?: number; providerMessage?: string };
    expect(body.providerStatus).toBe(400);
    expect(body.providerMessage).toContain("API_KEY_INVALID");
    expect(JSON.stringify(body)).not.toContain("test-key");
  });
  test("missing key stays 503 offline", async () => {
    delete process.env.GOOGLE_API_KEY;
    const res = await POST(new Request("http://localhost/api/examples", { method: "POST", body: JSON.stringify({ surface: "断食" }) }));
    expect(res.status).toBe(503);
  });
  test("requested level reaches the prompt, invalid level falls back to N5", async () => {
    process.env.GOOGLE_API_KEY = "test-key";
    const seen: string[] = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      seen.push(String((init?.body as string) ?? ""));
      const text = JSON.stringify([{ jp: "これは断食です。", en: "This is fasting." }]);
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;
    const ok = await POST(
      new Request("http://localhost/api/examples", { method: "POST", body: JSON.stringify({ surface: "断食", level: "N3" }) }),
    );
    expect(ok.status).toBe(200);
    expect(seen[0]).toContain("N3-level");
    const okBody = (await ok.json()) as { level?: string };
    expect(okBody.level).toBe("N3");
    const fallback = await POST(
      new Request("http://localhost/api/examples", { method: "POST", body: JSON.stringify({ surface: "断食", level: "N9" }) }),
    );
    expect(fallback.status).toBe(200);
    expect(seen[1]).toContain("N5-level");
  });
});

describe("parseExamples", () => {
  test("strips fences", () => {
    expect(parseExamples('```json\n[{"jp":"これは断食です。","en":"This is fasting."}]\n```')).toEqual([
      { jp: "これは断食です。", en: "This is fasting." },
    ]);
  });
});
