import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { nextAvailableAt } from "./kanjiSrs";

/** Item detail: the subject plus its SRS state (null before its lesson). */
export const getSubject = query({
  args: { subjectId: v.id("subjects") },
  handler: async (ctx, args) => {
    const subject = await ctx.db.get(args.subjectId);
    if (!subject) return null;
    const assignment = await ctx.db
      .query("assignments")
      .withIndex("by_subject", (q) => q.eq("subjectId", args.subjectId))
      .first();
    return { subject, assignment };
  },
});

/**
 * Replace the assignment's personal synonyms (accepted in reviews).
 * Requires a post-lesson assignment; lesson-stage items gain synonyms
 * editing once they enter SRS.
 */
export const setSynonyms = mutation({
  args: { subjectId: v.id("subjects"), synonyms: v.array(v.string()) },
  handler: async (ctx, args) => {
    const assignment = await ctx.db
      .query("assignments")
      .withIndex("by_subject", (q) => q.eq("subjectId", args.subjectId))
      .first();
    if (!assignment) throw new Error("Complete this item's lesson first");
    const synonyms = [...new Set(args.synonyms.map((s) => s.trim()).filter(Boolean))];
    await ctx.db.patch(assignment._id, { synonyms });
    return { synonyms };
  },
});

/** Manual resurrection: a burned item returns to Apprentice 1, fresh counts. */
export const resurrect = mutation({
  args: { subjectId: v.id("subjects") },
  handler: async (ctx, args) => {
    const assignment = await ctx.db
      .query("assignments")
      .withIndex("by_subject", (q) => q.eq("subjectId", args.subjectId))
      .first();
    if (!assignment) throw new Error("Complete this item's lesson first");
    if (assignment.stage !== 9) throw new Error("Only burned items can be resurrected");
    await ctx.db.patch(assignment._id, {
      stage: 1,
      availableAt: nextAvailableAt(1, Date.now()),
      guruFalls: 0,
    });
    return { stage: 1 };
  },
});
