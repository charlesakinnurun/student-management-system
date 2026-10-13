/**
 * Small dependency-free helpers shared across UI and services.
 * Avoiding utility libraries here keeps the dependency surface minimal.
 */

/** Conditional className joiner. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Format a date as e.g. "12 Oct 2026". Returns an em dash for null. */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Format a date+time for audit-style listings. */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Format a numeric amount as currency (defaults to NGN; institutions can override). */
export function formatCurrency(value: number | null | undefined, currency = "NGN"): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Compact number formatting for dashboard metrics (1.2k). */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

/** Initials for avatar fallbacks. */
export function initials(first?: string | null, last?: string | null): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

/** Clamp a number into an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Round to a fixed number of decimals without floating point drift surprises. */
export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Title-case a snake/camel value for display (e.g. "IN_PROGRESS" -> "In Progress"). */
export function humanize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const DURATION_UNITS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };

/** Parse a duration like "15m" / "7d" into seconds, with a fallback. */
export function parseDurationSeconds(input: string | undefined, fallback: number): number {
  if (!input) return fallback;
  const match = /^(\d+)\s*([smhd])$/.exec(input.trim());
  if (!match) return fallback;
  return Number(match[1]) * (DURATION_UNITS[match[2]] ?? 1);
}
