import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
    emailVerified: v.optional(v.boolean()),
  }).index("by_email", ["email"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  }).index("by_token", ["token"]),

  accounts: defineTable({
    userId: v.id("users"),
    accountId: v.string(),
    providerId: v.string(),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    password: v.optional(v.string()),
  }).index("by_provider", ["providerId", "accountId"]),

  // Kanji learner (single user, no auth in v1; owner is a placeholder for future sync).
  // Full per-item fields per the locked content pipeline; every CC-derived
  // field carries its source tag so attribution stays mechanical.
  subjects: defineTable({
    glyph: v.string(),
    type: v.union(
      v.literal("radical"),
      v.literal("kanji"),
      v.literal("vocabulary"),
    ),
    level: v.number(),
    meanings: v.array(v.string()),
    readings: v.array(v.string()),
    mnemonic: v.string(),
    components: v.array(v.string()),
    audioRef: v.union(v.string(), v.null()),
    examples: v.array(
      v.object({ text: v.string(), reading: v.string(), gloss: v.string() }),
    ),
    sources: v.array(v.string()),
    shipped: v.boolean(),
  }).index("by_level", ["level"]),

  assignments: defineTable({
    subjectId: v.id("subjects"),
    stage: v.number(),
    owner: v.optional(v.string()),
  }).index("by_subject", ["subjectId"]),
});
