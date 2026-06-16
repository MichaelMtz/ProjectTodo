import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";

const phaseObject = v.object({
  _id: v.id("phases"),
  _creationTime: v.number(),
  name: v.string(),
  icon: v.optional(v.string()),
  order: v.number(),
  comingSoon: v.optional(v.boolean()),
  archived: v.optional(v.boolean()),
});

const DEFAULT_PHASES: Array<{ name: string; icon: string; comingSoon?: boolean }> = [
  { name: "POC", icon: "🧪" },
  { name: "Foundation", icon: "🧱" },
  { name: "RAG", icon: "🔎" },
  { name: "Hardening", icon: "🛡️" },
  { name: "Launch", icon: "🚀", comingSoon: true },
];

/** List all non-archived phases in display order. */
export const list = query({
  args: { token: v.string() },
  returns: v.array(phaseObject),
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    const phases = await ctx.db.query("phases").withIndex("by_order").collect();
    return phases.filter((p) => !p.archived);
  },
});

/** Seed a starter set of phases the first time the workspace is empty. */
export const ensureSeeded = mutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    const existing = await ctx.db.query("phases").first();
    if (existing) {
      return null;
    }
    let order = 0;
    for (const phase of DEFAULT_PHASES) {
      await ctx.db.insert("phases", {
        name: phase.name,
        icon: phase.icon,
        comingSoon: phase.comingSoon,
        order: order++,
      });
    }
    return null;
  },
});

export const create = mutation({
  args: { token: v.string(), name: v.string(), icon: v.optional(v.string()) },
  returns: v.id("phases"),
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    const last = await ctx.db.query("phases").withIndex("by_order").order("desc").first();
    const order = last ? last.order + 1 : 0;
    return await ctx.db.insert("phases", {
      name: args.name.trim() || "Untitled phase",
      icon: args.icon,
      order,
    });
  },
});

export const rename = mutation({
  args: { token: v.string(), phaseId: v.id("phases"), name: v.string(), icon: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    await ctx.db.patch(args.phaseId, {
      name: args.name.trim() || "Untitled phase",
      ...(args.icon !== undefined ? { icon: args.icon } : {}),
    });
    return null;
  },
});

export const archive = mutation({
  args: { token: v.string(), phaseId: v.id("phases") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    await ctx.db.patch(args.phaseId, { archived: true });
    return null;
  },
});

/** Persist a new ordering of phases (array of ids in the desired order). */
export const reorder = mutation({
  args: { token: v.string(), orderedIds: v.array(v.id("phases")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token);
    let order = 0;
    for (const id of args.orderedIds) {
      await ctx.db.patch(id, { order: order++ });
    }
    return null;
  },
});
