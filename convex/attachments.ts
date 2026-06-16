import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";

export const generateUploadUrl = mutation({
  args: { token: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    return await ctx.storage.generateUploadUrl();
  },
});

export const save = mutation({
  args: {
    token: v.string(),
    todoId: v.id("todos"),
    storageId: v.id("_storage"),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
  },
  returns: v.id("attachments"),
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    return await ctx.db.insert("attachments", {
      todoId: args.todoId,
      storageId: args.storageId,
      filename: args.filename,
      contentType: args.contentType,
      size: args.size,
    });
  },
});

const attachmentItem = v.object({
  _id: v.id("attachments"),
  _creationTime: v.number(),
  todoId: v.id("todos"),
  storageId: v.id("_storage"),
  filename: v.string(),
  contentType: v.string(),
  size: v.number(),
  url: v.union(v.string(), v.null()),
});

export const listByTodo = query({
  args: { token: v.string(), todoId: v.id("todos") },
  returns: v.array(attachmentItem),
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    const attachments = await ctx.db
      .query("attachments")
      .withIndex("by_todo", (q) => q.eq("todoId", args.todoId))
      .collect();
    return await Promise.all(
      attachments.map(async (a) => ({
        ...a,
        url: await ctx.storage.getUrl(a.storageId),
      })),
    );
  },
});

export const remove = mutation({
  args: { token: v.string(), attachmentId: v.id("attachments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    const attachment = await ctx.db.get(args.attachmentId);
    if (attachment) {
      await ctx.storage.delete(attachment.storageId);
      await ctx.db.delete(args.attachmentId);
    }
    return null;
  },
});
