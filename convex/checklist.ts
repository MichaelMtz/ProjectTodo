import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";

const checklistItem = v.object({
  _id: v.id("checklistItems"),
  _creationTime: v.number(),
  todoId: v.id("todos"),
  text: v.string(),
  done: v.boolean(),
  order: v.number(),
});

export const listByTodo = query({
  args: { token: v.string(), todoId: v.id("todos") },
  returns: v.array(checklistItem),
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    const items = await ctx.db
      .query("checklistItems")
      .withIndex("by_todo", (q) => q.eq("todoId", args.todoId))
      .collect();
    items.sort((a, b) => a.order - b.order);
    return items;
  },
});

export const add = mutation({
  args: { token: v.string(), todoId: v.id("todos"), text: v.string() },
  returns: v.id("checklistItems"),
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    const last = await ctx.db
      .query("checklistItems")
      .withIndex("by_todo", (q) => q.eq("todoId", args.todoId))
      .collect();
    const order = last.reduce((max, i) => Math.max(max, i.order + 1), 0);
    return await ctx.db.insert("checklistItems", {
      todoId: args.todoId,
      text: args.text.trim(),
      done: false,
      order,
    });
  },
});

export const toggle = mutation({
  args: { token: v.string(), itemId: v.id("checklistItems") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Checklist item not found");
    await ctx.db.patch(args.itemId, { done: !item.done });
    return null;
  },
});

export const updateText = mutation({
  args: { token: v.string(), itemId: v.id("checklistItems"), text: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    await ctx.db.patch(args.itemId, { text: args.text });
    return null;
  },
});

export const remove = mutation({
  args: { token: v.string(), itemId: v.id("checklistItems") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    await ctx.db.delete(args.itemId);
    return null;
  },
});
