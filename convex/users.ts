import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireUser } from "./auth";
import { roleValidator } from "./schema";

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** The user behind a session token, or null if the token is invalid. */
export const me = query({
  args: { token: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      name: v.optional(v.string()),
      email: v.string(),
      role: v.optional(v.union(v.literal("developer"), v.literal("manager"))),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!session) return null;
    const user = await ctx.db.get(session.userId);
    if (!user) return null;
    return { _id: user._id, name: user.name, email: user.email, role: user.role };
  },
});

export const updateName = mutation({
  args: { token: v.string(), name: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.token);
    const trimmed = args.name.trim();
    if (!trimmed) throw new ConvexError("Name cannot be empty.");
    await ctx.db.patch(userId, { name: trimmed });
    return null;
  },
});

export const updateProfile = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    role: roleValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.token);
    const trimmed = args.name.trim();
    if (!trimmed) throw new ConvexError("Name cannot be empty.");
    await ctx.db.patch(userId, { name: trimmed, role: args.role });
    return null;
  },
});

export const changePassword = mutation({
  args: {
    token: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx, args.token);
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("User not found.");

    const currentHash = await hashPassword(args.currentPassword, user.salt);
    if (currentHash !== user.passwordHash) {
      throw new ConvexError("Current password is incorrect.");
    }
    if (args.newPassword.length < 6) {
      throw new ConvexError("New password must be at least 6 characters.");
    }

    const salt = crypto.randomUUID();
    const passwordHash = await hashPassword(args.newPassword, salt);
    await ctx.db.patch(userId, { passwordHash, salt });
    return null;
  },
});

// ---------------------------------------------------------------------------
// User management (developer-only)
// ---------------------------------------------------------------------------

const userListItem = v.object({
  _id: v.id("users"),
  email: v.string(),
  name: v.optional(v.string()),
  role: v.optional(v.union(v.literal("developer"), v.literal("manager"))),
  lastLogin: v.optional(v.number()),
});

async function requireDeveloper(
  ctx: Parameters<typeof requireUser>[0],
  token: string,
) {
  const userId = await requireUser(ctx, token);
  const user = await ctx.db.get(userId);
  if (!user || user.role !== "developer") {
    throw new ConvexError("Only developers can manage users.");
  }
  return userId;
}

export const list = query({
  args: { token: v.string() },
  returns: v.array(userListItem),
  handler: async (ctx, args) => {
    await requireDeveloper(ctx, args.token);
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      _id: u._id,
      email: u.email,
      name: u.name,
      role: u.role,
      lastLogin: u.lastLogin,
    }));
  },
});

export const addUser = mutation({
  args: {
    token: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    password: v.string(),
    role: roleValidator,
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    await requireDeveloper(ctx, args.token);
    const email = normalizeEmail(args.email);
    if (!email.includes("@")) {
      throw new ConvexError("Please enter a valid email address.");
    }
    if (args.password.length < 6) {
      throw new ConvexError("Password must be at least 6 characters.");
    }
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) {
      throw new ConvexError("A user with that email already exists.");
    }
    const salt = crypto.randomUUID();
    const passwordHash = await hashPassword(args.password, salt);
    return await ctx.db.insert("users", {
      email,
      name: args.name?.trim() || undefined,
      passwordHash,
      salt,
      role: args.role,
    });
  },
});

export const updateUser = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
    name: v.optional(v.string()),
    role: v.optional(roleValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireDeveloper(ctx, args.token);
    const target = await ctx.db.get(args.userId);
    if (!target) throw new ConvexError("User not found.");
    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name.trim() || undefined;
    if (args.role !== undefined) patch.role = args.role;
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.userId, patch);
    }
    return null;
  },
});

export const deleteUser = mutation({
  args: { token: v.string(), userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const callerId = await requireDeveloper(ctx, args.token);
    if (args.userId === callerId) {
      throw new ConvexError("You cannot delete your own account.");
    }
    const target = await ctx.db.get(args.userId);
    if (!target) throw new ConvexError("User not found.");
    // Remove all sessions for the deleted user.
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const s of sessions) {
      await ctx.db.delete(s._id);
    }
    await ctx.db.delete(args.userId);
    return null;
  },
});
