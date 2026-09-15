import { query } from "./_generated/server";
import { LEECH_FALLS, summarizeProgress } from "./kanjiSrs";

/**
 * Dashboard stats for the personal kanji learner (single user, no auth in v1).
 * Reads real tables; with no content seeded yet this is the honest empty state
 * (level 1, empty counts, null accuracy) — nothing hardcoded.
 */
export const getDashboard = query({
  args: {},
  handler: async (ctx) => {
    const assignments = await ctx.db.query("assignments").collect();
    const subjects = await ctx.db.query("subjects").collect();
    const stageBySubject = new Map(assignments.map((a) => [a.subjectId, a.stage]));
    const { userLevel } = summarizeProgress(
      subjects.map((s) => ({
        level: s.level,
        type: s.type,
        glyph: s.glyph,
        stage: stageBySubject.get(s._id) ?? null,
      })),
    );

    const guruOrAbove = assignments.filter((a) => a.stage >= 5).length;
    const total = assignments.length;
    const accuracy = null as number | null;

    // Forecast: counts of items per stage bucket due for review attention.
    const apprentice = assignments.filter((a) => a.stage >= 1 && a.stage <= 4).length;
    const guru = assignments.filter((a) => a.stage === 5 || a.stage === 6).length;
    const master = assignments.filter((a) => a.stage === 7).length;
    const enlightened = assignments.filter((a) => a.stage === 8).length;

    // Leeches: guru-fallen 3+ times, with their subjects for display.
    const subjectById = new Map(subjects.map((s) => [s._id, s]));
    const leeches = assignments
      .filter((a) => a.guruFalls >= LEECH_FALLS)
      .map((a) => {
        const subject = subjectById.get(a.subjectId);
        return subject
          ? { glyph: subject.glyph, type: subject.type, subjectId: subject._id }
          : null;
      })
      .filter((l) => l !== null);

    return {
      level: userLevel,
      guruOrAbove,
      total,
      accuracy,
      forecast: { apprentice, guru, master, enlightened },
      subjects: {
        total: subjects.length,
        radical: subjects.filter((s) => s.type === "radical").length,
        kanji: subjects.filter((s) => s.type === "kanji").length,
        vocabulary: subjects.filter((s) => s.type === "vocabulary").length,
      },
      leeches,
    };
  },
});
