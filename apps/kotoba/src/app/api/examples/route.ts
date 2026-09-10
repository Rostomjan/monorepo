import { NextResponse } from "next/server";

/** Online-optional LLM examples. Offline-first: client uses templateExamples() when this 503s. */
export async function POST(req: Request) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) return NextResponse.json({ error: "offline: no GOOGLE_API_KEY, use template" }, { status: 503 });
  const { surface, meaning } = (await req.json()) as { surface: string; meaning?: string };
  if (!surface?.trim()) return NextResponse.json({ error: "surface required" }, { status: 400 });
  const prompt = `Give 2 short N5-level Japanese example sentences using "${surface}" (${meaning ?? ""}). Return ONLY a JSON array like [{"jp":"…","en":"…"}].`;
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  );
  if (!r.ok) return NextResponse.json({ error: "llm failed" }, { status: 502 });
  const j = await r.json();
  const text: string = j.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
  const examples = parseExamples(text);
  return NextResponse.json({ examples });
}

function parseExamples(text: string): { jp: string; en?: string }[] {
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
