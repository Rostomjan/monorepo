import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { SEED_SUBJECTS } from "./kanjiSeedData";

// Convex's deploy typecheck runs without node types; the runtime does
// provide process.env (deployed variables), so declare the slice we read.
declare const process: { env: { SEED_KEY?: string } };

/**
 * Destructive mutations are gated by a shared secret: callers pass `key`,
 * compared against the SEED_KEY deployment variable. Fails closed — without
 * the variable set, nothing can write. Use a random unshared value in prod
 * (effectively disabling reseeds) and a known value on dev deployments.
 */
function assertSeedKey(key: string): void {
  const expected = process.env.SEED_KEY;
  if (!expected || key !== expected) {
    throw new Error("Missing or invalid seed key");
  }
}

/**
 * Reseed semantics: clear + insert. Deleting everything and re-running
 * seedKanji reproduces the subjects table exactly (single-user v1).
 */
export const clearKanji = mutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    assertSeedKey(args.key);
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
  args: { key: v.string() },
  handler: async (ctx, args) => {
    assertSeedKey(args.key);
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
