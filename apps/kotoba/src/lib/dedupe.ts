import type { Entry } from "./types";

const MASTERY_RANK = { unknown: 0, learning: 1, known: 2 } as const;

/**
 * Fold a duplicate entry into its survivor (same key).
 * Keeps the survivor's identity/schedule; takes the best mastery,
 * either favorite flag, missing meaning, and the union of alt-meanings.
 */
export function mergeEntries(survivor: Entry, duplicate: Entry): Entry {
  const altMeanings = [...(survivor.altMeanings ?? []), ...(duplicate.altMeanings ?? [])].filter(
    (m, i, arr) => m && arr.indexOf(m) === i,
  );
  const meaning = survivor.meaning || duplicate.meaning;
  return {
    ...survivor,
    mastery: MASTERY_RANK[duplicate.mastery] > MASTERY_RANK[survivor.mastery] ? duplicate.mastery : survivor.mastery,
    isFavorite: survivor.isFavorite || duplicate.isFavorite,
    favoritedAt: survivor.favoritedAt ?? duplicate.favoritedAt,
    meaning,
    altMeanings: altMeanings.length ? altMeanings : undefined,
    needsReview: !meaning,
  };
}

export function isConstraintError(err: unknown): boolean {
  return (
    !!err &&
    (err instanceof DOMException
      ? err.name === "ConstraintError"
      : typeof err === "object" && (err as { name?: string }).name === "ConstraintError")
  );
}

export interface KeyedRow {
  key: string;
}

/**
 * Save-time dedupe: split rows into unique vs duplicate against the
 * fresh DB key set plus keys already accepted in this batch.
 * Covers post-parse edits that the preview-time check never saw.
 */
export function splitDuplicates<T extends KeyedRow>(rows: T[], existingKeys: Set<string>): { unique: T[]; dupCount: number } {
  const seen = new Set<string>();
  const unique: T[] = [];
  let dupCount = 0;
  for (const r of rows) {
    if (existingKeys.has(r.key) || seen.has(r.key)) {
      dupCount++;
      continue;
    }
    seen.add(r.key);
    unique.push(r);
  }
  return { unique, dupCount };
}
