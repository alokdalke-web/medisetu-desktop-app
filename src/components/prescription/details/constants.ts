export const DEFAULT_ALLERGIES = [
  "Codeine",
  "Contrast dye",
  "Dust",
  "Eggs",
  "Latex",
  "NKDA",
  "NSAIDs",
  "Peanuts/Nuts",
  "Penicillin",
  "Pollen",
  "Shellfish",
  "Sulfa drugs",
];

export const DEFAULT_PROVISIONAL_DIAG = [
  "Acidity",
  "Allergy",
  "Body pain",
  "Cold/Cough",
  "Dengue",
  "Diarrhea",
  "Fever",
  "Flu",
  "Headache",
  "High BP",
  "Low BP",
  "Infection",
  "Malaria",
  "Migraine",
  "Stomach pain",
  "Diabetes",
  "Typhoid",
  "UTI",
  "Viral fever",
];

export const DEFAULT_SURGERY_SUGGESTED = [
  "Appendectomy",
  "Hernia repair",
  "Cataract surgery",
  "Tonsillectomy",
  "Cholecystectomy",
  "Knee arthroscopy",
];

export const DEFAULT_HABITS = ["Alcohol", "Smoking", "Tobacco"];

export const DEFAULT_HEADER_ORDER = [
  "Pathology Test Name",
  "Advice",
  "Dietary Suggestions",
  "Habits",
  "Vitals",
  "Allergy",
  "Diagnosis",
  "Surgery Suggested",
  "Visiting Days",
  "Follow-Up (days)",
];

export const DEFAULT_DIET_SUGGESTIONS_LIST = [
  "Drink boiled water.",
  "Eat small, frequent meals.",
  "Avoid spicy and oily foods.",
  "Include fruits and vegetables.",
  "Stay hydrated throughout the day.",
  "Limit caffeine and alcohol.",
  "Reduce salt and sugar intake.",
  "Include protein-rich foods.",
  "Avoid processed and junk foods.",
  "Maintain a balanced diet.",
];

export const VITAL_LIMITS = {
  bpSys: { min: 70, max: 220 },
  bpDia: { min: 40, max: 120 },
  pulse: { min: 40, max: 130 },
  spo2: { min: 70, max: 100 },
  temperatureC: { min: 32, max: 42 },
  heightCm: { min: 30, max: 200 },
  weightKg: { min: 1, max: 200 },
} as const;

export type VitalFieldKey = keyof typeof VITAL_LIMITS;
export type VitalErrors = Record<VitalFieldKey, string | null>;

export const CALENDAR_DAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

/**
 * Shared field styling for the clinical panel.
 *
 * `text-text` rather than a hand-picked slate step: `.dark` inverts the slate
 * scale, so `dark:text-slate-100` resolves to a near-black navy and made typed
 * text almost invisible on dark backgrounds (the same bug fixed app-wide in the
 * shared input primitives). Placeholders must stay *dimmer* than the value, so
 * they use `text-text-subtle`, not white.
 */
export const FIELD_CN = {
  inputWrapper:
    "rounded-2xl border-line bg-surface shadow-none data-[hover=true]:border-primary/40 data-[focus=true]:border-primary",
  input: "text-text placeholder:text-text-subtle",
} as const;
