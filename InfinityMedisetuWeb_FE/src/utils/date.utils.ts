/**
 * date.utils.ts
 * Centralised date helpers used across the appointment module.
 * All functions are pure and timezone-aware.
 */

// ─── Re-export from existing date.ts so callers only need one import ──────────
export {
  addDays,
  getTodayIST,
  parseYmdLocal,
  startOfWeekLocal,
  toYmd,
  weekRangeFromDate,
} from "./date";

// ─── New helpers ──────────────────────────────────────────────────────────────

/** Returns true when the string is a valid YYYY-MM-DD date. */
export const isYmdString = (value?: string | null): value is string =>
  !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);

/**
 * Reads a YYYY-MM-DD value from sessionStorage.
 * Returns null when the key is missing or the value is not a valid YMD string.
 */
export const getStoredYmd = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  const stored = sessionStorage.getItem(key);
  return isYmdString(stored) ? stored : null;
};

/**
 * Returns today's local date as a YYYY-MM-DD string.
 * Uses the local timezone (not IST-specific).
 */
export const getTodayLocal = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/**
 * Formats a 24-hour time string (HH:MM or HH:MM:SS) into { h, m }.
 * Handles optional AM/PM suffix.
 */
export const parseTimeTo24h = (timeStr: string): { h: number; m: number } => {
  if (!timeStr) return { h: 0, m: 0 };

  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) {
    const [h, m] = timeStr.split(":").map(Number);
    return { h: h || 0, m: m || 0 };
  }

  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();

  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;

  return { h, m };
};
