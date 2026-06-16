import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";

const commentObject = v.object({
  _id: v.id("comments"),
  _creationTime: v.number(),
  todoId: v.id("todos"),
  authorId: v.id("users"),
  authorName: v.string(),
  body: v.string(),
});

export const listByTodo = query({
  args: { token: v.string(), todoId: v.id("todos") },
  returns: v.array(commentObject),
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_todo", (q) => q.eq("todoId", args.todoId))
      .collect();
    const result = [];
    for (const c of comments) {
      const user = await ctx.db.get(c.authorId);
      result.push({ ...c, authorName: user?.name ?? user?.email ?? "Someone" });
    }
    return result;
  },
});

export const add = mutation({
  args: { token: v.string(), todoId: v.id("todos"), body: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.token);
    const body = args.body.trim();
    if (!body) return null;
    await ctx.db.insert("comments", { todoId: args.todoId, authorId: userId, body });
    await ctx.db.insert("activity", {
      todoId: args.todoId,
      authorId: userId,
      message: "commented",
    });
    return null;
  },
});
