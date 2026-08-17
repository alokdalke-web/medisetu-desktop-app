/**
 * Built-in instruction suggestions, keyed by medicine form.
 *
 * The Instruction field is free text and means something different per form —
 * a syrup needs an amount ("5 ml"), a cream needs a technique and a site
 * ("apply a thin layer to the affected area"), an injection needs a route.
 * Offering the same blank box for all of them made the doctor retype the same
 * phrases every visit, so each form bucket gets its own tap-to-fill set.
 *
 * These are starting points, not prescriptions: every suggestion drops into an
 * editable field, and the doctor can type anything instead. Amounts are kept to
 * the few conventional defaults that are always confirmed by the doctor before
 * saving; anything patient-specific is deliberately left out.
 */

/** Buckets share a suggestion set; the order here is the order shown. */
const SUGGESTIONS_BY_BUCKET = {
  topical: [
    "Apply a thin layer to the affected area",
    "Apply to the affected area",
    "Apply after cleaning and drying the area",
    "Massage gently until absorbed",
    "Avoid contact with eyes",
  ],
  liquidOral: [
    "5 ml",
    "10 ml",
    "Shake well before use",
    "Use the measuring cap provided",
    "Dilute in water before taking",
  ],
  drops: [
    "1 drop in each eye",
    "2 drops in each eye",
    "2 drops in each ear",
    "2 drops in each nostril",
    "Shake well before use",
  ],
  spray: [
    "1 spray in each nostril",
    "2 sprays in each nostril",
    "Spray on the affected area",
    "Shake well before use",
  ],
  inhaler: [
    "1 puff",
    "2 puffs",
    "Rinse mouth after use",
    "Use with a spacer",
  ],
  injection: [
    "Intramuscular",
    "Intravenous",
    "Subcutaneous",
    "To be administered by a nurse",
  ],
  sachet: [
    "Dissolve 1 sachet in a glass of water",
    "Mix with water before taking",
    "Take with plenty of water",
  ],
  mouthRinse: [
    "Rinse for 30 seconds and spit out",
    "Do not swallow",
    "Do not eat or drink for 30 minutes after use",
  ],
  wash: [
    "Apply to wet hair, leave for 5 minutes, then rinse",
    "Apply to the affected area and rinse off",
    "Use twice a week",
  ],
  suppository: ["Insert rectally", "Insert at bedtime"],
  patch: [
    "Apply to clean, dry skin",
    "Replace every 24 hours",
    "Rotate the application site",
  ],
  oralSolid: [
    "Swallow whole with water",
    "Do not crush or chew",
    "Take with plenty of water",
    "Dissolve under the tongue",
  ],
} as const;

type SuggestionBucket = keyof typeof SUGGESTIONS_BY_BUCKET;

/**
 * Form → bucket. Keys are lowercase to match the `COMPACT_*` form constants
 * used elsewhere in the editor.
 */
const BUCKET_BY_FORM: Record<string, SuggestionBucket> = {
  cream: "topical",
  ointment: "topical",
  gel: "topical",
  lotion: "topical",
  paste: "topical",
  oil: "topical",
  foam: "topical",
  "mouth gel": "topical",
  "dental cement": "topical",
  "dental varnish": "topical",

  syrup: "liquidOral",
  suspension: "liquidOral",
  liquid: "liquidOral",
  solution: "liquidOral",

  drops: "drops",
  spray: "spray",
  inhaler: "inhaler",
  injection: "injection",

  sachet: "sachet",
  granules: "sachet",
  powder: "sachet",

  mouthwash: "mouthRinse",
  "oral rinse": "mouthRinse",
  toothpaste: "mouthRinse",

  shampoo: "wash",
  soap: "wash",
  facewash: "wash",
  conditioner: "wash",
  handwash: "wash",
  sanitizer: "wash",

  suppository: "suppository",
  patch: "patch",

  tablet: "oralSolid",
  capsule: "oralSolid",
  lozenge: "oralSolid",
};

/**
 * Suggestions for a medicine form. Returns an empty array for an unknown or
 * missing form so callers render nothing rather than guessing — an irrelevant
 * suggestion is worse than none on a prescription.
 */
export function getInstructionSuggestions(form?: string | null): string[] {
  const bucket = BUCKET_BY_FORM[String(form ?? "").trim().toLowerCase()];
  return bucket ? [...SUGGESTIONS_BY_BUCKET[bucket]] : [];
}
