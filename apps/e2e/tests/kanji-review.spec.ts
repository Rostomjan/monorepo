import { test, expect } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@repo/backend/convex/_generated/api";
import radicals from "../../kanji/content/level-1/radicals.json";

/**
 * Kanji critical-flow smoke: a full review session through correct, typo,
 * and wrong paths, ending at the wrap-up table with per-item stage moves.
 *
 * Requirements (else this file skips cleanly, including in CI):
 * - CONVEX_URL (or NEXT_PUBLIC_CONVEX_URL) pointing at a dev deployment with
 *   ALLOW_TEST_HOOKS=1, e.g. after `convex dev` in packages/backend.
 * - The kanji dev server on KANJI_URL (default http://localhost:3001),
 *   booted automatically by playwright.config.ts with NEXT_PUBLIC_CONVEX_URL
 *   passed through.
 */
const KANJI_URL = process.env.KANJI_URL ?? "http://localhost:3001";
const CONVEX_URL =
  process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? "";

test.skip(
  !CONVEX_URL,
  "needs CONVEX_URL/NEXT_PUBLIC_CONVEX_URL pointing at a dev deployment (ALLOW_TEST_HOOKS=1)",
);

const MEANINGS = new Map(
  (radicals as Array<{ glyph: string; meanings: string[] }>).map((r) => [
    r.glyph,
    r.meanings,
  ]),
);

/** One-character mutation; caller ensures the base is long enough. */
function typoOf(meaning: string): string {
  const last = meaning.endsWith("m") ? "n" : "m";
  return meaning.slice(0, -1) + last;
}

test.beforeAll(async () => {
  const client = new ConvexHttpClient(CONVEX_URL);
  await client.mutation(api.kanjiSeed.clearKanji, {});
  await client.mutation(api.kanjiSeed.seedKanji, {});
  const queue = await client.query(api.kanjiLessons.getLessonQueue, { limit: 5 });
  expect(queue.length).toBe(5);
  await client.mutation(api.kanjiLessons.completeLessonBatch, {
    results: queue.map((s) => ({ subjectId: s._id, passed: true })),
  });
  await client.mutation(api.kanjiTest.debugMakeDue, {});
});

test("full review session reaches the wrap-up with correct stage moves", async ({
  page,
}) => {
  await page.goto(`${KANJI_URL}/review`);

  // Radicals are meaning-only: one prompt per item, five prompts total.
  // Prompt 3 takes the wrong path; the first prompt with a long enough
  // meaning takes the typo path; the rest are exact.
  const expected: Array<{ glyph: string; to: number; mark: string }> = [];
  let typoUsed = false;
  for (let prompt = 0; prompt < 5; prompt++) {
    const glyph = ((await page.getByTestId("quiz-glyph").textContent()) ?? "").trim();
    const meanings = MEANINGS.get(glyph) ?? [];
    expect(meanings.length).toBeGreaterThan(0);
    const base = meanings[0];
    let kind: "correct" | "typo" | "wrong";
    if (prompt === 2) {
      kind = "wrong";
    } else if (!typoUsed && base.length >= 5) {
      kind = "typo";
      typoUsed = true;
    } else {
      kind = "correct";
    }
    const answer =
      kind === "correct" ? base : kind === "typo" ? typoOf(base) : "zzz-not-a-meaning";
    const to = kind === "wrong" ? 1 : 2;
    const mark = kind === "correct" ? "✓" : kind === "typo" ? "≈" : "✗";
    expected.push({ glyph, to, mark });
    await page.locator('form input[name="answer"]').fill(answer);
    await page.locator('form button[type="submit"]').click();
  }
  expect(typoUsed).toBe(true);

  const table = page.getByTestId("wrap-up");
  await expect(table).toBeVisible();
  const rows = table.locator("tbody tr");
  await expect(rows).toHaveCount(5);
  for (let i = 0; i < 5; i++) {
    const cells = rows.nth(i).locator("td");
    await expect(cells.nth(0)).toHaveText(expected[i].glyph);
    await expect(cells.nth(1)).toContainText(expected[i].mark);
    await expect(cells.nth(2)).toContainText(expected[i].to === 2 ? "1 ↑ 2" : "1 → 1");
  }
});
