import { mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// Home-brewed email + password auth.
//
// This is intentionally simple (salted SHA-256, opaque random session tokens)
// and meant for a local, single-project tool — not a hardened public service.
// The client stores the returned token and passes it to every function.
// ---------------------------------------------------------------------------

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}

function newToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Resolve the signed-in user from a session token, or throw. */
export async function requireUser(
  ctx: QueryCtx | MutationCtx,
  token: string,
): Promise<Id<"users">> {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!session) {
    throw new Error("Not authenticated");
  }
  return session.userId;
}

export const signUp = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
  },
  returns: v.object({ token: v.string() }),
  handler: async (ctx, args) => {
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
      throw new ConvexError("An account with that email already exists.");
    }
    const salt = crypto.randomUUID();
    const passwordHash = await hashPassword(args.password, salt);
    // First user gets "developer" role; subsequent users default to "manager".
    const allUsers = await ctx.db.query("users").collect();
    const role = allUsers.length === 0 ? ("developer" as const) : ("manager" as const);
    const userId = await ctx.db.insert("users", {
      email,
      name: args.name?.trim() || undefined,
      passwordHash,
      salt,
      role,
      lastLogin: Date.now(),
    });
    const token = newToken();
    await ctx.db.insert("sessions", { userId, token });
    return { token };
  },
});

export const signIn = mutation({
  args: { email: v.string(), password: v.string() },
  returns: v.object({ token: v.string() }),
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!user) {
      throw new ConvexError("Invalid email or password.");
    }
    const hash = await hashPassword(args.password, user.salt);
    if (hash !== user.passwordHash) {
      throw new ConvexError("Invalid email or password.");
    }
    await ctx.db.patch(user._id, { lastLogin: Date.now() });
    const token = newToken();
    await ctx.db.insert("sessions", { userId: user._id, token });
    return { token };
  },
});

export const signOut = mutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (session) {
      await ctx.db.delete(session._id);
    }
    return null;
  },
});
