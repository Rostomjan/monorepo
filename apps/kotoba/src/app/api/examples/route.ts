import { NextResponse } from "next/server";

/** Online-optional LLM examples. Offline-first: client uses templateExamples() when this 503s. */
export async function POST(req: Request) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) return NextResponse.json({ error: "offline: no GOOGLE_API_KEY, use template" }, { status: 503 });
  const { surface, meaning } = (await req.json()) as { surface: string; meaning?: string };
  const prompt = `Give 2 short N5-level Japanese example sentences using "${surface}" (${meaning ?? ""}). Return JSON array [{jp, en}].`;
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
  return NextResponse.json({ raw: text });
}
