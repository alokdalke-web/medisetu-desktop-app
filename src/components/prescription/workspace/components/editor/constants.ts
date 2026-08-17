/** Form buckets and shared control styling for the per-medicine dose editor. */

export const COMPACT_ORAL_FORMS = [
  "tablet",
  "capsule",
  "lozenge",
  "syrup",
  "suspension",
];

export const COMPACT_APPLICATION_FORMS = [
  "cream",
  "ointment",
  "gel",
  "lotion",
  "paste",
  "oil",
  "spray",
  "foam",
  "mouthwash",
  "oral rinse",
  "toothpaste",
  "mouth gel",
  "dental cement",
  "dental varnish",
  "inhaler",
  "patch",
  "suppository",
  "shampoo",
  "soap",
  "facewash",
  "conditioner",
  "sanitizer",
  "handwash",
  "sachet",
  "granules",
  "powder",
  "liquid",
  "drops",
];

export const INJECTION_FORM = "injection";

export const INJECTION_ROUTE_OPTIONS = ["IV", "IM", "SC", "ID"] as const;

export const controlClassName =
  "h-9 w-full min-w-0 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 focus:z-10 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-subtle placeholder:text-text-subtle";
