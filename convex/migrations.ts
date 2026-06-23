import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * One-time: rename todo type "chore" → "core".
 *
 * Run after deploy:
 *   bunx convex run migrations:migrateChoreToCore
 *
 * Self-hosted production:
 *   CONVEX_SELF_HOSTED_URL=... CONVEX_SELF_HOSTED_ADMIN_KEY=... \
 *     bunx convex run migrations:migrateChoreToCore
 *
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
