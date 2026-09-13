import dict from "../data/dict-compact.json";
import type { DictRecord, Jlpt } from "./types";
import { normalizeSurface } from "./normalize";

const index = new Map<string, DictRecord>();
for (const r of dict as DictRecord[]) index.set(normalizeSurface(r.k), r);

function lookupDict(surface: string): DictRecord | undefined {
  return index.get(normalizeSurface(surface));
}

export interface Enriched {
  surface: string;
  reading: string;
  meaning: string;
  altMeanings: string[];
  jlpt: Jlpt;
  frequencyRank?: number;
  pitch?: string;
  needsReview: boolean;
  noHit: boolean;
}

export function enrichSurface(raw: string): Enriched {
  const surface = normalizeSurface(raw);
  const hit = lookupDict(surface);
  if (hit) {
    return {
      surface,
      reading: hit.r || surface,
      meaning: hit.g[0] ?? "",
      altMeanings: hit.g.slice(1, 3),
      jlpt: hit.j === 0 ? "unknown" : hit.j,
      frequencyRank: hit.f,
      pitch: hit.p,
      needsReview: false,
      noHit: false,
    };
  }
  // Phrase fallback: longest-prefix token split against dict
  const tokens = greedySplit(surface);
  if (tokens.length > 1) {
    const readings: string[] = [];
    const glosses: string[] = [];
    let allKnown = true;
    for (const t of tokens) {
      const h = lookupDict(t);
      if (h) {
        readings.push(h.r || t);
        if (glosses.length < 3) glosses.push(h.g[0]);
      } else {
        readings.push(t);
        allKnown = false;
      }
    }
    return {
      surface,
      reading: readings.join(""),
      meaning: glosses.join("; "),
      altMeanings: [],
      jlpt: "unknown",
      needsReview: true,
      noHit: !allKnown && glosses.length === 0,
    };
  }
  return {
    surface,
    reading: surface,
    meaning: "",
    altMeanings: [],
    jlpt: "unknown",
    needsReview: true,
    noHit: true,
  };
}

function greedySplit(s: string): string[] {
  const out: string[] = [];
  let rest = s;
  while (rest.length > 0) {
    let matched: string | null = null;
    for (let len = Math.min(rest.length, 8); len >= 1; len--) {
      const cand = rest.slice(0, len);
      if (index.has(normalizeSurface(cand))) {
        matched = cand;
        break;
      }
    }
    if (matched) {
      out.push(matched);
      rest = rest.slice(matched.length);
    } else {
      // consume one char (particle/kana passthrough)
      out.push(rest.slice(0, 1));
      rest = rest.slice(1);
    }
    if (out.length > 24) break;
  }
  // merge single-char particles back to keep tokens readable
  return out;
}
