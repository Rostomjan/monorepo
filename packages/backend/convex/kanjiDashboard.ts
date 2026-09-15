import { query } from "./_generated/server";

/**
 * Dashboard stats for the personal kanji learner (single user, no auth in v1).
 * Reads real tables; with no content seeded yet this is the honest empty state
 * (level 0, empty forecast, null accuracy) — nothing hardcoded.
 */
export const getDashboard = query({
  args: {},
  handler: async (ctx) => {
    const assignments = await ctx.db.query("assignments").collect();
    const subjects = await ctx.db.query("subjects").collect();

    const guruOrAbove = assignments.filter((a) => a.stage >= 5).length;
    const total = assignments.length;
    const accuracy = null as number | null;

    // Forecast: counts of items per stage bucket due for review attention.
    const apprentice = assignments.filter((a) => a.stage >= 1 && a.stage <= 4).length;
    const guru = assignments.filter((a) => a.stage === 5 || a.stage === 6).length;
    const master = assignments.filter((a) => a.stage === 7).length;
    const enlightened = assignments.filter((a) => a.stage === 8).length;

    return {
      // Level stays null until the progression module (leveling ticket) computes
      // it from guru'd kanji; the dashboard renders this as an empty state.
      level: null as number | null,
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
    };
  },
});
