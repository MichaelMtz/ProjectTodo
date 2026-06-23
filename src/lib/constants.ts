export type Status = "todo" | "in_progress" | "in_review" | "done";
export type Priority = "low" | "medium" | "high" | "critical";
export type TodoType = "task" | "bug" | "feature" | "core";

export const COLUMNS: Array<{ key: Status; label: string; color: string }> = [
  { key: "todo", label: "Todo", color: "var(--col-todo)" },
  { key: "in_progress", label: "In Progress", color: "var(--col-progress)" },
  { key: "in_review", label: "In Review", color: "var(--col-review)" },
  { key: "done", label: "Done", color: "var(--col-done)" },
];

export const PRIORITIES: Array<{ key: Priority; label: string; color: string }> = [
  { key: "low", label: "Low", color: "var(--prio-low)" },
  { key: "medium", label: "Medium", color: "var(--prio-medium)" },
  { key: "high", label: "High", color: "var(--prio-high)" },
  { key: "critical", label: "Critical", color: "var(--prio-critical)" },
];

export const TYPES: Array<{ key: TodoType; label: string; icon: string }> = [
  { key: "task", label: "Task", icon: "◻︎" },
  { key: "bug", label: "Bug", icon: "🐞" },
  { key: "feature", label: "Feature", icon: "✦" },
  { key: "core", label: "Core", icon: "⚙︎" },
];
