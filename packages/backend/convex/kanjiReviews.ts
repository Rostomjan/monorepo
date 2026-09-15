import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { demoteStage, LEECH_FALLS, nextAvailableAt } from "./kanjiSrs";

export const HALVES = ["meaning", "reading"] as const;
export type ReviewHalf = (typeof HALVES)[number];
export type HalfVerdict = "correct" | "typo" | "wrong";

/**
 * Review queue: assignments due now (availableAt <= now) with their subjects,
 * ordered lower stages first, then earliest availability. Unbounded per the
 * locked batching rules; the client interleaves meaning/reading halves.
 */
export const getReviewQueue = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const assignments = await ctx.db.query("assignments").collect();
    const due = assignments
      .filter((a) => a.availableAt <= now && a.stage < 9)
      .sort((a, b) => a.stage - b.stage || a.availableAt - b.availableAt);
    const items = [];
    for (const a of due) {
      const subject = await ctx.db.get(a.subjectId);
      if (!subject || !subject.shipped) continue;
      items.push({
        assignmentId: a._id,
        stage: a.stage,
        synonyms: a.synonyms,
        subject,
      });
    }
    return items;
  },
});

/**
 * Submit one review session. Per-item verdicts come from the client
 * (typo counts as correct for movement, flagged for display):
 * - any "wrong" half -> demote per the locked formula, reschedule;
 * - all halves correct/typo -> +1 stage (burn at 9), reschedule.
 * A fall from guru back below guru bumps guruFalls (leech at threshold).
 */
export const submitReviews = mutation({
  args: {
    results: v.array(
      v.object({
        assignmentId: v.id("assignments"),
        meaning: v.union(
          v.literal("correct"),
          v.literal("typo"),
          v.literal("wrong"),
        ),
        reading: v.union(
          v.literal("correct"),
          v.literal("typo"),
          v.literal("wrong"),
        ),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const movements = [];
    for (const r of args.results) {
      const assignment = await ctx.db.get(r.assignmentId);
      if (!assignment) continue;
      const wrongs = [r.meaning, r.reading].filter((h) => h === "wrong").length;
      const from = assignment.stage;
      const to = wrongs === 0 ? Math.min(9, from + 1) : demoteStage(from, wrongs);
      const fellFromGuru = from >= 5 && to < 5;
      const guruFalls = assignment.guruFalls + (fellFromGuru ? 1 : 0);
      await ctx.db.patch(r.assignmentId, {
        stage: to,
        availableAt: to >= 9 ? Number.MAX_SAFE_INTEGER : nextAvailableAt(to, now),
        guruFalls,
      });
      movements.push({
        assignmentId: r.assignmentId,
        from,
        to,
        leech: guruFalls >= LEECH_FALLS,
      });
    }
    return { movements };
  },
});
