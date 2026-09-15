/**
 * Shared SRS math for the kanji learner (pure functions, no Convex imports
 * so they stay unit-testable with bun test).
 *
 * Locked tuning (wayfinding): uniform WaniKani table, no L1-2 acceleration;
 * WK demotion formula; leech flag at >= 3 guru-falls.
 */

/** Stage -> wait before the next review, in milliseconds. Stage 9 is burned. */
export const STAGE_INTERVAL_MS: Record<number, number> = {
  1: 4 * 3_600_000,
  2: 8 * 3_600_000,
  3: 23 * 3_600_000,
  4: 47 * 3_600_000,
  5: 167 * 3_600_000,
  6: 335 * 3_600_000,
  7: 719 * 3_600_000,
  8: 2879 * 3_600_000,
};

/** Leech threshold: guru-fall events before the leech flag. */
export const LEECH_FALLS = 3;

/** Next review availability after reaching `stage` at time `now`. */
export function nextAvailableAt(stage: number, now: number): number {
  const wait = STAGE_INTERVAL_MS[stage];
  if (wait === undefined) throw new Error(`No interval for stage ${stage}`);
  return now + wait;
}

/**
 * WK demotion: new = current - ceil(wrongs/2) * (2 if stage >= 5 else 1),
 * floored at stage 1. Meaning + reading errors in one session share the count.
 */
export function demoteStage(currentStage: number, wrongsInSession: number): number {
  const steps = Math.ceil(wrongsInSession / 2) * (currentStage >= 5 ? 2 : 1);
  return Math.max(1, currentStage - steps);
}

/** Passing the level-up bar: >= 90% of level kanji at guru (stage >= 5). */
export function levelUpReached(kanjiTotal: number, kanjiGuru: number): boolean {
  if (kanjiTotal === 0) return false;
  return kanjiGuru / kanjiTotal >= 0.9;
}
