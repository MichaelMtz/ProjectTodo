import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * One-time: rename todo type "chore" → "core".
 *
 * Local dev (uses .env.local from `convex dev`):
 *   bunx convex run migrations:migrateChoreToCore
 *
 * Self-hosted production (same secrets as GitHub Actions deploy — NOT CONVEX_DEPLOYMENT):
 *   CONVEX_SELF_HOSTED_URL='https://your-convex-backend' \
 *   CONVEX_SELF_HOSTED_ADMIN_KEY='your-admin-key' \
 *     bunx convex run migrations:migrateChoreToCore
 *
 * Run from your laptop in the repo root, or on the VPS with the repo checked out.
 * Safe to re-run (no-op once nothing is left on "chore").
 * After updated > 0 (or confirmed 0 remain), remove v.literal("chore") from schema.ts.
 */
export const migrateChoreToCore = internalMutation({
  args: {},
  returns: v.object({ updated: v.number() }),
  handler: async (ctx) => {
    const todos = await ctx.db.query("todos").collect();
    let updated = 0;
    for (const todo of todos) {
      if (todo.type === "chore") {
        await ctx.db.patch(todo._id, { type: "core" });
        updated += 1;
      }
    }
    return { updated };
  },
});
