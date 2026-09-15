import { mutation } from "./_generated/server";

// Convex's deploy typecheck runs without node types; the runtime does
// provide process.env (deployed variables), so declare the slice we read.
declare const process: { env: { ALLOW_TEST_HOOKS?: string } };

/**
 * Test-only helpers for the e2e smoke test. Every function refuses unless
 * the deployment sets ALLOW_TEST_HOOKS=1 (dev deployments only, never prod).
 */
function assertTestHooks(): void {
  if (process.env.ALLOW_TEST_HOOKS !== "1") {
    throw new Error("Test hooks are disabled (set ALLOW_TEST_HOOKS=1 on a dev deployment)");
  }
}

/** Make every assignment due now so a review session can start on demand. */
export const debugMakeDue = mutation({
  args: {},
  handler: async (ctx) => {
    assertTestHooks();
    const assignments = await ctx.db.query("assignments").collect();
    for (const a of assignments) {
      await ctx.db.patch(a._id, { availableAt: 0 });
    }
    return { madeDue: assignments.length };
  },
});
