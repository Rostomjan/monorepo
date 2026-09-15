import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { nextAvailableAt, summarizeProgress } from "./kanjiSrs";

const TYPE_ORDER = { radical: 0, kanji: 1, vocabulary: 2 } as const;

/**
 * Lesson queue: shipped, unstarted subjects that are unlocked — the
 * subject's level is at or below the user level and every listed component
 * is guru'd (radicals have no components, so they unlock by level alone).
 * Ordered by dependency (level, then radical -> kanji -> vocabulary).
 * Pending vocab elsewhere never blocks: gating is per-subject, and only
 * kanji count toward level-up.
 */
export const getLessonQueue = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(10, Math.max(3, Math.round(args.limit ?? 5)));
    const subjects = await ctx.db.query("subjects").collect();
    const assignments = await ctx.db.query("assignments").collect();
    const stageBySubject = new Map(assignments.map((a) => [a.subjectId, a.stage]));
    const { userLevel, guru } = summarizeProgress(
      subjects.map((s) => ({
        level: s.level,
        type: s.type,
        glyph: s.glyph,
        stage: stageBySubject.get(s._id) ?? null,
      })),
    );
    const assigned = new Set(stageBySubject.keys());
    return subjects
      .filter(
        (s) =>
          s.shipped &&
          !assigned.has(s._id) &&
          s.level <= userLevel &&
          s.components.every((c) => guru.has(c)),
      )
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
        synonyms: [],
      });
      passed += 1;
    }
    return { passed, failed };
  },
});
