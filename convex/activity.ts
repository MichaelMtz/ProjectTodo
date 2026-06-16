import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";

const activityObject = v.object({
  _id: v.id("activity"),
  _creationTime: v.number(),
  todoId: v.id("todos"),
  authorId: v.optional(v.id("users")),
  authorName: v.string(),
  message: v.string(),
});

export const listByTodo = query({
  args: { token: v.string(), todoId: v.id("todos") },
  returns: v.array(activityObject),
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    const rows = await ctx.db
      .query("activity")
      .withIndex("by_todo", (q) => q.eq("todoId", args.todoId))
      .order("desc")
      .collect();
    const result = [];
    for (const row of rows) {
      const user = row.authorId ? await ctx.db.get(row.authorId) : null;
      result.push({ ...row, authorName: user?.name ?? user?.email ?? "System" });
    }
    return result;
  },
});
