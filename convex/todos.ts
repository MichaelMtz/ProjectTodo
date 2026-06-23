import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { statusValidator, priorityValidator, typeValidator } from "./schema";
import { requireUser } from "./auth";

async function syncLinkedChecklist(ctx: MutationCtx, todoId: Id<"todos">, done: boolean) {
  const allItems = await ctx.db.query("checklistItems").collect();
  for (const item of allItems) {
    if (item.linkedTodoId === todoId && item.done !== done) {
      await ctx.db.patch(item._id, { done });
    }
  }
}

async function logActivity(
  ctx: MutationCtx,
  todoId: Id<"todos">,
  authorId: Id<"users">,
  message: string,
) {
  await ctx.db.insert("activity", { todoId, authorId, message });
}

async function userName(ctx: QueryCtx, userId: Id<"users">): Promise<string> {
  const user = await ctx.db.get(userId);
  return user?.name ?? user?.email ?? "Someone";
}

const checklistPreviewItem = v.object({
  text: v.string(),
  done: v.boolean(),
});

const todoCard = v.object({
  _id: v.id("todos"),
  _creationTime: v.number(),
  phaseId: v.id("phases"),
  title: v.string(),
  description: v.string(),
  status: statusValidator,
  priority: priorityValidator,
  type: typeValidator,
  tags: v.array(v.string()),
  category: v.optional(v.string()),
  startDate: v.optional(v.number()),
  dueDate: v.optional(v.number()),
  order: v.number(),
  authorId: v.id("users"),
  authorName: v.string(),
  checklistTotal: v.number(),
  checklistDone: v.number(),
  checklistPreview: v.array(checklistPreviewItem),
  commentCount: v.number(),
});

async function enrich(ctx: QueryCtx, todo: Doc<"todos">) {
  const checklist = await ctx.db
    .query("checklistItems")
    .withIndex("by_todo", (q) => q.eq("todoId", todo._id))
    .collect();
  const comments = await ctx.db
    .query("comments")
    .withIndex("by_todo", (q) => q.eq("todoId", todo._id))
    .collect();
  const sorted = checklist.sort((a, b) => a.order - b.order);
  return {
    ...todo,
    authorName: await userName(ctx, todo.authorId),
    checklistTotal: checklist.length,
    checklistDone: checklist.filter((c) => c.done).length,
    checklistPreview: sorted.slice(0, 3).map((c) => ({ text: c.text, done: c.done })),
    commentCount: comments.length,
  };
}

/** List the cards for a phase, optionally narrowed by a title search. */
export const listByPhase = query({
  args: { token: v.string(), phaseId: v.id("phases"), search: v.optional(v.string()) },
  returns: v.array(todoCard),
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    const search = args.search?.trim();
    let todos: Array<Doc<"todos">>;
    if (search) {
      todos = await ctx.db
        .query("todos")
        .withSearchIndex("search_title", (q) =>
          q.search("title", search).eq("phaseId", args.phaseId),
        )
        .collect();
    } else {
      todos = await ctx.db
        .query("todos")
        .withIndex("by_phase", (q) => q.eq("phaseId", args.phaseId))
        .collect();
    }
    todos.sort((a, b) => a.order - b.order);
    return await Promise.all(todos.map((t) => enrich(ctx, t)));
  },
});

/** Active (todo/in progress/in review) and done counts for each phase. */
export const countsByPhase = query({
  args: { token: v.string() },
  returns: v.array(
    v.object({
      phaseId: v.id("phases"),
      active: v.number(),
      done: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    const todos = await ctx.db.query("todos").collect();
    const counts = new Map<Id<"phases">, { active: number; done: number }>();

    for (const todo of todos) {
      const entry = counts.get(todo.phaseId) ?? { active: 0, done: 0 };
      if (todo.status === "done") {
        entry.done += 1;
      } else {
        entry.active += 1;
      }
      counts.set(todo.phaseId, entry);
    }

    return Array.from(counts.entries()).map(([phaseId, { active, done }]) => ({
      phaseId,
      active,
      done,
    }));
  },
});

/** Distinct tags used across all todos, sorted alphabetically. */
export const listAllTags = query({
  args: { token: v.string() },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    const todos = await ctx.db.query("todos").collect();
    const tags = new Set<string>();
    for (const todo of todos) {
      for (const tag of todo.tags) {
        tags.add(tag);
      }
    }
    return [...tags].sort((a, b) => a.localeCompare(b));
  },
});

export const get = query({
  args: { token: v.string(), todoId: v.id("todos") },
  returns: v.union(todoCard, v.null()),
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    const todo = await ctx.db.get(args.todoId);
    if (!todo) return null;
    return await enrich(ctx, todo);
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    phaseId: v.id("phases"),
    title: v.optional(v.string()),
    status: v.optional(statusValidator),
  },
  returns: v.id("todos"),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.token);
    const status = args.status ?? "todo";
    // Place new cards at the top of their column.
    const top = await ctx.db
      .query("todos")
      .withIndex("by_phase_and_status", (q) =>
        q.eq("phaseId", args.phaseId).eq("status", status),
      )
      .order("asc")
      .first();
    const order = top ? top.order - 1 : 0;
    const todoId = await ctx.db.insert("todos", {
      phaseId: args.phaseId,
      title: args.title?.trim() || "Untitled",
      description: "",
      status,
      priority: "medium",
      type: "task",
      tags: [],
      order,
      authorId: userId,
    });
    await logActivity(ctx, todoId, userId, "created this card");
    return todoId;
  },
});

const STATUS_LABELS: Record<string, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

export const update = mutation({
  args: {
    token: v.string(),
    todoId: v.id("todos"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(statusValidator),
    priority: v.optional(priorityValidator),
    type: v.optional(typeValidator),
    tags: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    startDate: v.optional(v.union(v.number(), v.null())),
    dueDate: v.optional(v.union(v.number(), v.null())),
    phaseId: v.optional(v.id("phases")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.token);
    const todo = await ctx.db.get(args.todoId);
    if (!todo) throw new Error("Todo not found");

    const patch: Partial<Doc<"todos">> = {};
    if (args.title !== undefined) patch.title = args.title.trim() || "Untitled";
    if (args.description !== undefined) patch.description = args.description;
    if (args.priority !== undefined) patch.priority = args.priority;
    if (args.type !== undefined) patch.type = args.type;
    if (args.tags !== undefined) patch.tags = args.tags;
    if (args.category !== undefined) patch.category = args.category;
    if (args.startDate !== undefined) patch.startDate = args.startDate ?? undefined;
    if (args.dueDate !== undefined) patch.dueDate = args.dueDate ?? undefined;
    if (args.status !== undefined) patch.status = args.status;
    if (args.phaseId !== undefined) patch.phaseId = args.phaseId;

    await ctx.db.patch(args.todoId, patch);

    if (args.phaseId !== undefined && args.phaseId !== todo.phaseId) {
      const phase = await ctx.db.get(args.phaseId);
      await logActivity(
        ctx,
        args.todoId,
        userId,
        `moved this to phase "${phase?.name ?? "Unknown"}"`,
      );
    }

    if (args.status !== undefined && args.status !== todo.status) {
      await logActivity(
        ctx,
        args.todoId,
        userId,
        `moved this to ${STATUS_LABELS[args.status]}`,
      );
      await syncLinkedChecklist(ctx, args.todoId, args.status === "done");
    }
    if (args.priority !== undefined && args.priority !== todo.priority) {
      await logActivity(
        ctx,
        args.todoId,
        userId,
        `changed priority to ${args.priority}`,
      );
    }
    return null;
  },
});

/**
 * Reposition a card after a drag: set its status, then renumber the
 * destination column to match the provided id order.
 */
export const setColumn = mutation({
  args: {
    token: v.string(),
    todoId: v.id("todos"),
    status: statusValidator,
    orderedIds: v.array(v.id("todos")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.token);
    const todo = await ctx.db.get(args.todoId);
    if (!todo) throw new Error("Todo not found");

    const statusChanged = todo.status !== args.status;
    if (statusChanged) {
      await ctx.db.patch(args.todoId, { status: args.status });
      await logActivity(
        ctx,
        args.todoId,
        userId,
        `moved this to ${STATUS_LABELS[args.status]}`,
      );
      await syncLinkedChecklist(ctx, args.todoId, args.status === "done");
    }
    let order = 0;
    for (const id of args.orderedIds) {
      await ctx.db.patch(id, { order: order++ });
    }
    return null;
  },
});

export const remove = mutation({
  args: { token: v.string(), todoId: v.id("todos") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    for (const table of ["checklistItems", "comments", "activity"] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_todo", (q) => q.eq("todoId", args.todoId))
        .collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
    }
    const attachments = await ctx.db
      .query("attachments")
      .withIndex("by_todo", (q) => q.eq("todoId", args.todoId))
      .collect();
    for (const a of attachments) {
      await ctx.storage.delete(a.storageId);
      await ctx.db.delete(a._id);
    }
    await ctx.db.delete(args.todoId);
    return null;
  },
});
