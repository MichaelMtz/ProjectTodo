/** "May 27" style short date. */
export function shortDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** Relative time like "3h ago", "2d ago". */
export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return shortDate(ts);
}

/** Rough "N min read" based on description length (~200 wpm). */
export function minRead(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

/** Convert a yyyy-mm-dd input value <-> epoch ms. */
export function dateInputValue(ts?: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateInput(value: string): number | null {
  if (!value) return null;
  const ts = new Date(value + "T00:00:00").getTime();
  return Number.isNaN(ts) ? null : ts;
}

export function initials(nameOrEmail: string): string {
  const base = nameOrEmail.split("@")[0];
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return letters.join("") || "?";
}
