/**
 * Shared morning-noon-night schedule-pattern logic.
 *
 * Previously duplicated (with drift) in `PrescriptionMedicineSidebar` and
 * `PrescriptionEditorCard`: the sidebar's list omitted "0-0-0" and was ordered
 * by hand, the editor's included it and was sorted. Both lists are preserved
 * here as separate exports so neither caller's option set changes.
 */

/** Every 3-slot pattern with per-slot counts 0-2, sorted. Includes "0-0-0". */
export const ALL_SCHEDULE_PATTERNS: string[] = (() => {
  const patterns: string[] = [];
  for (let morning = 0; morning <= 2; morning += 1) {
    for (let noon = 0; noon <= 2; noon += 1) {
      for (let night = 0; night <= 2; night += 1) {
        patterns.push(`${morning}-${noon}-${night}`);
      }
    }
  }
  return patterns;
})();

/**
 * The picker's set — same patterns minus "0-0-0", kept in the hand-tuned
 * frequency order the sidebar already shipped (once/twice/thrice-daily first,
 * exotic double-dose patterns last) rather than numeric order. A doctor opening
 * the dropdown should see "1-1-1" and "1-0-1" without scrolling; sorting these
 * numerically would bury both behind eight "0-*" patterns.
 */
export const SELECTABLE_SCHEDULE_PATTERNS = [
  "1-1-1",
  "1-1-0",
  "1-0-1",
  "1-0-0",
  "0-1-1",
  "0-1-0",
  "0-0-1",
  "2-0-2",
  "0-0-2",
  "0-1-2",
  "0-2-0",
  "0-2-1",
  "0-2-2",
  "1-0-2",
  "1-1-2",
  "1-2-0",
  "1-2-1",
  "1-2-2",
  "2-0-0",
  "2-0-1",
  "2-1-0",
  "2-1-1",
  "2-1-2",
  "2-2-0",
  "2-2-1",
  "2-2-2",
];

export type SchedulePatternSuggestion = {
  pattern: string;
  digits: string;
  label: string;
};

export const toSuggestions = (
  patterns: string[],
): SchedulePatternSuggestion[] =>
  patterns.map((pattern) => ({
    pattern,
    digits: pattern.replace(/-/g, ""),
    label: pattern === "0-0-0" ? "None" : pattern,
  }));

export const DEFAULT_SCHEDULE_PATTERN = "1-1-1";
export const MIN_SCHEDULE_DIGITS = "100";

export const digitsToSchedulePattern = (digits: string) =>
  `${digits[0]}-${digits[1]}-${digits[2]}`;

export const sanitizeScheduleDigits = (value: string) =>
  value.replace(/[^012]/g, "").slice(0, 3);

/** Accepts either "1-0-1" or "101" and normalises to dashed form. */
export const getSchedulePatternFromInput = (value: string) => {
  const trimmed = value.trim();
  const digitValue = trimmed.replace(/-/g, "");

  if (/^[0-2]-[0-2]-[0-2]$/.test(trimmed)) return trimmed;
  if (/^[0-2]{3}$/.test(digitValue)) return digitsToSchedulePattern(digitValue);

  return "";
};

/**
 * Backspace semantics for the schedule field: decrement the last non-zero slot
 * rather than deleting a character, so the value is never briefly invalid.
 */
export const getPreviousScheduleDigits = (value: string) => {
  const digits = sanitizeScheduleDigits(value).padEnd(3, "0").slice(0, 3);
  const parts = digits.split("").map(Number);

  for (let index = parts.length - 1; index >= 0; index -= 1) {
    if (parts[index] > 0) {
      parts[index] -= 1;
      const nextDigits = parts.join("");
      return nextDigits === "000" ? digits : nextDigits;
    }
  }

  return MIN_SCHEDULE_DIGITS;
};

export const FOOD_TIMING_OPTIONS = [
  "Before Food",
  "After Food",
  "Empty stomach",
] as const;

export type StandardFoodTiming = (typeof FOOD_TIMING_OPTIONS)[number];

export const isStandardFoodTiming = (
  value: string,
): value is StandardFoodTiming =>
  FOOD_TIMING_OPTIONS.some((option) => option === value);
