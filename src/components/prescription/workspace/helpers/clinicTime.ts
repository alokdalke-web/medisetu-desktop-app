/**
 * Display helpers for the backend's `timestamp` columns.
 *
 * `report_cards.created_at` / `updated_at` are Postgres `timestamp` **without**
 * time zone: they hold a bare wall clock, written in the clinic's timezone. The
 * API still serializes them with a `Z` suffix ("2026-08-06T12:47:06.000Z"),
 * which is a lie — that value is not UTC.
 *
 * Passing such a string through `new Date(...).toLocaleTimeString()` therefore
 * converts an already-local wall clock *again*, putting every timestamp one full
 * offset into the future (5h30m in IST — a 12:47 pm save displayed as 06:17 pm).
 *
 * The fix is to read the clock the backend wrote rather than re-deriving it:
 * these helpers parse the calendar fields out of the string and never let the
 * browser's timezone touch them.
 */

const TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
];

type ClinicTimeParts = {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
};

/** Calendar fields exactly as the backend wrote them, or `null` if unparseable. */
export const parseClinicTime = (
  value?: string | null,
): ClinicTimeParts | null => {
  if (!value) return null;

  const match = TIMESTAMP_PATTERN.exec(String(value).trim());
  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hours: Number(match[4]),
    minutes: Number(match[5]),
    seconds: Number(match[6] ?? 0),
  };
};

/**
 * Comparable ordering key. Not an epoch — only differences between two values
 * from the same source are meaningful, which is all the "was this edited?"
 * check needs.
 */
export const clinicTimeOrder = (value?: string | null): number | null => {
  const parts = parseClinicTime(value);
  if (!parts) return null;

  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hours,
    parts.minutes,
    parts.seconds,
  );
};

/** "06 Aug 2026  ·  12:47 pm" — the clock the backend stored, unshifted. */
export const formatClinicTime = (value?: string | null): string => {
  const parts = parseClinicTime(value);
  if (!parts) return "";

  const hour12 = parts.hours % 12 === 0 ? 12 : parts.hours % 12;
  const meridiem = parts.hours < 12 ? "am" : "pm";
  const day = String(parts.day).padStart(2, "0");
  const minutes = String(parts.minutes).padStart(2, "0");

  return `${day} ${MONTHS[parts.month - 1] ?? ""} ${parts.year}  ·  ${hour12}:${minutes} ${meridiem}`;
};
