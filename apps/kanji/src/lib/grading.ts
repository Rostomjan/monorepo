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
  const a = answer.trim();
  return readings.some((r) => r === a);
}
