/**
 * Answer checking shared by the lesson and review runners (app-local session
 * logic; presentational components stay in @repo/ui).
 *
 * Lessons are strict: exact match, case-insensitive, trimmed. The typo
 * forgiveness rule is review-specific and layers on top of these checks.
 */

export type SubjectType = "radical" | "kanji" | "vocabulary";
export type Half = "meaning" | "reading";

/** Quiz halves per subject type: radicals are meaning-only. */
export function halvesFor(type: SubjectType): Half[] {
  return type === "radical" ? ["meaning"] : ["meaning", "reading"];
}

export function checkMeaning(meanings: string[], answer: string): boolean {
  const a = answer.trim().toLowerCase();
  return meanings.some((m) => m.toLowerCase() === a);
}

export function checkReading(readings: string[], answer: string): boolean {
  const a = normalizeReading(answer.trim());
  return readings.some((r) => normalizeReading(r) === a);
}

/**
 * Reading normalization: katakana folds to hiragana (learners type hiragana
 * for on'yomi, which content stores katakana per upstream), okurigana dots
 * ("ひと.つ") are stripped. Display keeps the stored form.
 */
export function normalizeReading(s: string): string {
  return s
    .replace(/\./g, "")
    .replace(/[ァ-ン]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

export type MeaningVerdict = "correct" | "typo" | "wrong";

/** Edit distance (Levenshtein) for the review typo rule. */
function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [
    i,
    ...Array(b.length).fill(0),
  ]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return d[a.length][b.length];
}

/**
 * Locked review typo rule: an answer within edit-distance 1 of an accepted
 * meaning (length 5+) is forgiven-but-flagged. Readings are always strict;
 * use checkReading for those.
 */
export function checkMeaningReview(meanings: string[], answer: string): MeaningVerdict {
  const a = answer.trim().toLowerCase();
  const accepted = meanings.map((m) => m.toLowerCase());
  if (accepted.includes(a)) return "correct";
  if (
    a.length >= 5 &&
    accepted.some((m) => editDistance(m, a) <= 1)
  ) {
    return "typo";
  }
  return "wrong";
}
