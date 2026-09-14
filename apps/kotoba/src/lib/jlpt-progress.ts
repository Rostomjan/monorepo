import { detectKind, entryKey, normalizeSurface } from "./normalize";
import type { DictRecord, Entry, Jlpt } from "./types";

/** Progress scope: N4–N1 only (N5 stays in the dict for enrichment, excluded here). */
export const PROGRESS_LEVELS = ["N4", "N3", "N2", "N1"] as const;
export type ProgressLevel = (typeof PROGRESS_LEVELS)[number];
export type ProgressBucket = "known" | "learning" | "to-learn";

export interface LevelWord {
  surface: string;
  reading: string;
  meaning: string;
  bucket: ProgressBucket;
}

export interface LevelProgress {
  level: ProgressLevel;
  total: number;
  known: number;
  learning: number;
  toLearn: number;
  words: LevelWord[];
}

const MASTERY_RANK = { known: 2, learning: 1, unknown: 0 } as const;

/**
 * Join dict JLPT records against library mastery.
 * Dedupes dict by normalized surface (kana aliases collapse).
 * Suspended/blacklisted entries still count — progress is knowledge, not queue.
 */
export function buildProgressIndex(
  dict: DictRecord[],
  entries: Entry[],
): Record<ProgressLevel, LevelProgress> {
  const best = new Map<string, number>();
  for (const e of entries) {
    const s = normalizeSurface(e.surface);
    const r = MASTERY_RANK[e.mastery] ?? 0;
    if (r > (best.get(s) ?? -1)) best.set(s, r);
  }
  const seen = new Set<string>();
  const init = (level: ProgressLevel): LevelProgress => ({ level, total: 0, known: 0, learning: 0, toLearn: 0, words: [] });
  const out: Record<ProgressLevel, LevelProgress> = { N4: init("N4"), N3: init("N3"), N2: init("N2"), N1: init("N1") };
  for (const rec of dict) {
    if (rec.j === 0 || rec.j === "unknown" || rec.j === "N5") continue;
    const level = rec.j as ProgressLevel;
    if (!out[level]) continue;
    const surface = normalizeSurface(rec.k);
    if (seen.has(`${level}｜${surface}`)) continue;
    seen.add(`${level}｜${surface}`);
    const rank = best.get(surface) ?? -1;
    const bucket: ProgressBucket = rank === 2 ? "known" : rank === 1 ? "learning" : "to-learn";
    const lp = out[level];
    lp.total++;
    if (bucket === "known") lp.known++;
    else if (bucket === "learning") lp.learning++;
    else lp.toLearn++;
    lp.words.push({ surface: rec.k, reading: rec.r || rec.k, meaning: rec.g[0] ?? "", bucket });
  }
  for (const lp of Object.values(out)) {
    lp.words.sort((a, b) => (a.surface < b.surface ? -1 : 1));
  }
  return out;
}

/** Shape a to-learn word as a new library entry (caller inserts + dedupes). */
export function toNewEntry(word: LevelWord, level: ProgressLevel, now = Date.now()): Entry {
  const reading = word.reading || word.surface;
  return {
    key: entryKey(word.surface, reading),
    surface: word.surface,
    reading,
    meaning: word.meaning,
    kind: detectKind(word.surface),
    jlpt: level as Jlpt,
    mastery: "unknown",
    isFavorite: false,
    source: "seed",
    createdAt: now,
    dueAt: now,
    intervalDays: 1,
  };
}
