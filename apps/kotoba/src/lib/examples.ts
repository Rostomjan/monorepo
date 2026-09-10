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
  target?: string,
): { jp: string; en?: string; unknownCount: number }[] {
  return candidates
    .map((c) => ({ ...c, unknownCount: countUnknown(c.jp, knownSurfaces, target) }))
    .sort((a, b) => a.unknownCount - b.unknownCount || a.jp.length - b.jp.length);
}

/** Greedy longest-prefix token split against known surfaces. Single kana/particles pass through as known. */
export function countUnknown(jp: string, knownSurfaces: Set<string>, target?: string): number {
  let unknown = 0;
  let rest = jp;
  let guard = 0;
  while (rest.length > 0 && guard++ < 64) {
    let matched: string | null = null;
    const maxLen = Math.min(rest.length, 8);
    for (let len = maxLen; len >= 1; len--) {
      const cand = rest.slice(0, len);
      if (cand === target || knownSurfaces.has(cand)) {
        matched = cand;
        break;
      }
    }
    if (matched) {
      rest = rest.slice(matched.length);
      continue;
    }
    const ch = rest[0];
    // kana particles / punctuation / ascii are structural, not unknown vocab
    if (/[\u3040-\u309f\u30a0-\u30ff、。！？!?…「」。『』、・\s\d\w]/.test(ch)) {
      rest = rest.slice(1);
      continue;
    }
    // unknown kanji run: consume one char as one unknown token, then skip
    // following kana (okurigana) so 食べる counts once, not 3x
    unknown++;
    rest = rest.slice(1);
    while (rest.length > 0 && /[\u3040-\u309f]/.test(rest[0])) rest = rest.slice(1);
  }
  return unknown;
}
