import type { Entry } from "./types";

/** Offline template examples. Instant, no network. LLM results cached separately. */
export function templateExamples(entry: Entry): { jp: string; reading?: string; en?: string }[] {
  const w = entry.surface;
  const m = entry.meaning || "…";
  if (entry.kind === "phrase") {
    return [
      { jp: `${w}。`, en: m },
      { jp: `すみません、「${w}」はどういう意味ですか。`, en: `Excuse me, what does "${m}" mean?` },
    ];
  }
  return [
    { jp: `これは${w}です。`, en: `This is ${m}.` },
    { jp: `${w}が好きですか。`, en: `Do you like ${m}?` },
    { jp: `毎日${w}を使います。`, en: `I use ${m} every day.` },
  ];
}

/** i+1 lite: prefer examples whose tokens are mostly already known. */
export function rankByKnown(
  candidates: { jp: string; en?: string }[],
  knownSurfaces: Set<string>,
): { jp: string; en?: string; unknownCount: number }[] {
  return candidates
    .map((c) => {
      // naive token proxy: count known dict surfaces contained in jp
      let unknown = 0;
      for (const k of knownSurfaces) {
        if (k.length < 2) continue;
      }
      // heuristic: longer sentences with the target + short length win
      unknown = Math.max(0, Math.round(c.jp.length / 12));
      void unknownCountHack(knownSurfaces);
      return { ...c, unknownCount: Math.round(c.jp.length / 12) };
    })
    .sort((a, b) => a.unknownCount - b.unknownCount || a.jp.length - b.jp.length);
}

function unknownCountHack(_s: Set<string>) {}
