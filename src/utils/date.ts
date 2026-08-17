
/**
 * Returns today's date as a YYYY-MM-DD string in IST (UTC+5:30).
 */
export const getTodayIST = (): string => {
  const now = new Date();
  // Offset to IST: UTC + 5h30m
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  return ist.toISOString().slice(0, 10);
};

/**
 * Converts a Date object to a YYYY-MM-DD string using local time.
 */
export const toYmd = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/**
 * Parses a YYYY-MM-DD string into a local Date (midnight, no timezone shift).
 */
export const parseYmdLocal = (ymd: string): Date => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/**
 * Adds `days` days to a Date and returns a new Date.
 */
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Returns the Monday (start of ISO week) for the given date, in local time.
 */
export const startOfWeekLocal = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Returns { start, end } as YYYY-MM-DD strings for the ISO week
 * (Monday–Sunday) containing the given date.
 */
export const weekRangeFromDate = (
  date: Date,
): { start: string; end: string } => {
  const start = startOfWeekLocal(date);
  const end = addDays(start, 6);
  return { start: toYmd(start), end: toYmd(end) };
};
