import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { nextAvailableAt } from "./kanjiSrs";

const TYPE_ORDER = { radical: 0, kanji: 1, vocabulary: 2 } as const;

/**
 * Lesson queue: shipped subjects with no assignment yet, in dependency
 * order (level, then radical -> kanji -> vocabulary). Batch size defaults
 * to 5, adjustable 3-10 per the locked batching rules.
 */
export const getLessonQueue = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(10, Math.max(3, Math.round(args.limit ?? 5)));
    const subjects = await ctx.db.query("subjects").collect();
    const assignments = await ctx.db.query("assignments").collect();
    const assigned = new Set(assignments.map((a) => a.subjectId));
    return subjects
      .filter((s) => s.shipped && !assigned.has(s._id))
      .sort(
        (a, b) =>
          a.level - b.level ||
          TYPE_ORDER[a.type] - TYPE_ORDER[b.type] ||
          (a.glyph < b.glyph ? -1 : 1),
      )
      .slice(0, limit);
  },
});

/**
 * Submit lesson quiz results. Passed items enter SRS stage 1 with review
 * availability per the locked interval table; failed items stay in lessons
 * (no assignment written).
 */
export const completeLessonBatch = mutation({
  args: {
    results: v.array(
      v.object({ subjectId: v.id("subjects"), passed: v.boolean() }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let passed = 0;
    let failed = 0;
    for (const r of args.results) {
      const existing = await ctx.db
        .query("assignments")
        .withIndex("by_subject", (q) => q.eq("subjectId", r.subjectId))
        .first();
      if (existing) continue;
      if (!r.passed) {
        failed += 1;
        continue;
      }
      await ctx.db.insert("assignments", {
        subjectId: r.subjectId,
        stage: 1,
        availableAt: nextAvailableAt(1, now),
        guruFalls: 0,
      });
      passed += 1;
    }
    return { passed, failed };
  },
});
