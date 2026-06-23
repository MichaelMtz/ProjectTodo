import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Status of a todo card == which Kanban column it lives in.
export const statusValidator = v.union(
  v.literal("todo"),
  v.literal("in_progress"),
  v.literal("in_review"),
  v.literal("done"),
);

export const priorityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical"),
);

export const typeValidator = v.union(
  v.literal("task"),
  v.literal("bug"),
  v.literal("feature"),
  v.literal("core"),
  v.literal("chore"), // legacy — run migrations:migrateChoreToCore, then remove
);

export const roleValidator = v.union(
  v.literal("developer"),
  v.literal("manager"),
);

export default defineSchema({
  // Home-brewed auth: a user with a salted+hashed password.
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    passwordHash: v.string(),
    salt: v.string(),
    role: v.optional(roleValidator),
    lastLogin: v.optional(v.number()),
  }).index("by_email", ["email"]),

  // Opaque session tokens handed to the client after sign in/up.
  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  // A "phase" is one Kanban board in the sidebar (POC, Foundation, RAG, ...).
  phases: defineTable({
    name: v.string(),
    icon: v.optional(v.string()),
    order: v.number(),
    comingSoon: v.optional(v.boolean()),
    archived: v.optional(v.boolean()),
  }).index("by_order", ["order"]),

  // A todo/note card.
  todos: defineTable({
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
    // Sort position within a column (lower = higher up).
    order: v.number(),
    authorId: v.id("users"),
  })
    .index("by_phase", ["phaseId"])
    .index("by_phase_and_status", ["phaseId", "status"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["phaseId"],
    }),

  checklistItems: defineTable({
    todoId: v.id("todos"),
    text: v.string(),
    done: v.boolean(),
    order: v.number(),
    linkedTodoId: v.optional(v.id("todos")),
  }).index("by_todo", ["todoId"]),

  comments: defineTable({
    todoId: v.id("todos"),
    authorId: v.id("users"),
    body: v.string(),
  }).index("by_todo", ["todoId"]),

  activity: defineTable({
    todoId: v.id("todos"),
    authorId: v.optional(v.id("users")),
    message: v.string(),
  }).index("by_todo", ["todoId"]),

  attachments: defineTable({
    todoId: v.id("todos"),
    storageId: v.id("_storage"),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
  }).index("by_todo", ["todoId"]),
});
