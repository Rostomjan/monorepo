import { mutation } from "./_generated/server";
import { SEED_SUBJECTS } from "./kanjiSeedData";

/**
 * Reseed semantics: clear + insert. Deleting everything and re-running
 * seedKanji reproduces the subjects table exactly (single-user v1).
 */
export const clearKanji = mutation({
  args: {},
  handler: async (ctx) => {
    for (const table of ["assignments", "subjects"] as const) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
      if (docs.length > 0) console.log(`cleared ${docs.length} rows from ${table}`);
    }
    return { cleared: true };
  },
});

export const seedKanji = mutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;
    for (const s of SEED_SUBJECTS) {
      if (!s.shipped) continue;
      await ctx.db.insert("subjects", {
        glyph: s.glyph,
        type: s.type,
        level: s.level,
        meanings: s.meanings,
        readings: s.readings,
        mnemonic: s.mnemonic,
        components: s.components,
        audioRef: s.audioRef,
        examples: s.examples,
        sources: s.sources,
        shipped: s.shipped,
      });
      inserted += 1;
    }
    return { inserted };
  },
});
