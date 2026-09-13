import { NextResponse } from "next/server";
import { parseExampleLevel } from "../../../lib/example-level";

const MODEL = process.env.GOOGLE_MODEL ?? "gemini-2.5-flash-lite";
const UPSTREAM_TIMEOUT_MS = 10_000;
const MAX_PROVIDER_SNIPPET = 500;

/** Online-optional LLM examples. Offline-first: client uses templateExamples() when this 503s/502s. */
export async function POST(req: Request) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) return NextResponse.json({ error: "offline: no GOOGLE_API_KEY, use template" }, { status: 503 });
  let body: { surface?: string; meaning?: string; level?: unknown };
  try {
    body = (await req.json()) as { surface?: string; meaning?: string; level?: unknown };
  } catch {
    return NextResponse.json({ error: "surface required" }, { status: 400 });
  }
  const surface = body.surface?.trim();
  if (!surface) return NextResponse.json({ error: "surface required" }, { status: 400 });
  const level = parseExampleLevel(body.level);
  const prompt = `Give 2 short ${level}-level Japanese example sentences using "${surface}" (${body.meaning ?? ""}). Return ONLY a JSON array like [{"jp":"…","en":"…"}].`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  let r: Response;
  try {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: ctrl.signal,
    });
  } catch (e) {
    clearTimeout(t);
    console.error("[kotoba/examples] upstream fetch threw", e instanceof Error ? e.name : typeof e);
    return NextResponse.json({ error: "llm unavailable" }, { status: 502 });
  }
  clearTimeout(t);
  if (!r.ok) {
    const snippet = await readTruncated(r, MAX_PROVIDER_SNIPPET);
    console.error("[kotoba/examples] upstream non-ok", r.status, snippet);
    return NextResponse.json({ error: "llm failed", providerStatus: r.status, providerMessage: snippet }, { status: 502 });
  }
  let j: { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  try {
    j = (await r.json()) as typeof j;
  } catch {
    console.error("[kotoba/examples] upstream bad json");
    return NextResponse.json({ error: "llm failed" }, { status: 502 });
  }
  const text: string = j.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
  const examples = parseExamples(text);
  return NextResponse.json({ examples, level });
}

async function readTruncated(r: Response, max: number): Promise<string> {
  try {
    return (await r.text()).slice(0, max);
  } catch {
    return "";
  }
}

export function parseExamples(text: string): { jp: string; en?: string }[] {
  // LLM often wraps JSON in ``` fences — strip them before parsing.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? text;
  const start = fenced.indexOf("[");
  const end = fenced.lastIndexOf("]");
  if (start < 0 || end <= start) return [];
  try {
    const arr = JSON.parse(fenced.slice(start, end + 1)) as { jp?: string; en?: string }[];
    return arr.filter((e) => typeof e.jp === "string" && e.jp.trim()).map((e) => ({ jp: e.jp!.trim(), en: e.en?.trim() }));
  } catch {
    return [];
  }
}
