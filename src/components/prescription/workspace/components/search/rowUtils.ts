import { normalizeKey } from "../../helpers/medicineMappers";
import { DEFAULT_SCHEDULE_PATTERN } from "../../helpers/schedulePattern";
import type { QuickDoseDraft } from "../../../../../types/prescription";

/**
 * Stable DOM id for a picker row, used to wire `aria-activedescendant` from the
 * search input to the keyboard-highlighted option.
 */
export const buildRowId = (prefix: string, name: string) =>
  `rx-med-${prefix}-${normalizeKey(name)}`.replace(/[^a-zA-Z0-9_-]/g, "-");

/** The dose a medicine gets when the doctor accepts the defaults. */
export const createQuickDoseDraft = (
  overrides: Partial<QuickDoseDraft> = {},
): QuickDoseDraft => ({
  pattern: DEFAULT_SCHEDULE_PATTERN,
  days: 5,
  timing: "After Food",
  frequency: "daily",
  instruction: "",
  ...overrides,
});
