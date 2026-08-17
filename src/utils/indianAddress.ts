/**
 * India-specific address helpers.
 *
 * Geocoders don't always expose a `locality`/`administrative_area_level_1` pair
 * for a dropped pin — a plus-code result in a small colony often carries only a
 * sublocality — yet the formatted address they return does spell the place out:
 *
 *   "PVWX+V9P, Ratna Lok Colony, Indore, Madhya Pradesh 452010, India"
 *   "GJJQ+XR7, Anandwadi, Maharashtra 414701, India"
 *
 * Read right-to-left that string is fully determined: country, then state
 * (optionally carrying the pincode), then the city. This module parses that
 * shape and validates the parts against the actual Indian state list, so a
 * colony name can never be mistaken for a state and a foreign address is
 * rejected outright rather than half-filled.
 */

/** States and union territories, plus the aliases geocoders still return. */
const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

/** Older or alternate names, mapped to the canonical entry above. */
const STATE_ALIASES: Record<string, string> = {
  orissa: "Odisha",
  pondicherry: "Puducherry",
  uttaranchal: "Uttarakhand",
  "new delhi": "Delhi",
  "nct of delhi": "Delhi",
  "national capital territory of delhi": "Delhi",
  "dadra and nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
  "daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
  "andaman & nicobar islands": "Andaman and Nicobar Islands",
  "jammu & kashmir": "Jammu and Kashmir",
};

const normalizeKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const STATE_BY_KEY = new Map<string, string>([
  ...INDIAN_STATES.map((state) => [normalizeKey(state), state] as const),
  ...Object.entries(STATE_ALIASES).map(
    ([alias, state]) => [normalizeKey(alias), state] as const,
  ),
]);

/** A 6-digit PIN that doesn't start with 0 — the actual Indian format. */
const PINCODE_RE = /\b[1-9]\d{5}\b/;

/** Open Location Code fragment, e.g. "PVWX+V9P" — never part of an address. */
const PLUS_CODE_RE = /^[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,3}$/i;

/**
 * Canonical Indian state name, or "" when the text isn't one. Used both to
 * validate what a geocoder returned and to recognise the state inside a
 * formatted address.
 */
export const normalizeIndianState = (value?: string | null): string =>
  STATE_BY_KEY.get(normalizeKey(String(value ?? ""))) || "";

export const isIndianPincode = (value?: string | null): boolean =>
  PINCODE_RE.test(String(value ?? "").trim()) &&
  String(value ?? "").trim().length === 6;

/** Whether a formatted address belongs to India. Blank counts as unknown, not foreign. */
export const isIndianAddress = (formattedAddress?: string | null): boolean => {
  const parts = String(formattedAddress ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return true;
  return normalizeKey(parts[parts.length - 1]) === "india";
};

export type ParsedIndianAddress = {
  city: string;
  state: string;
  pincode: string;
};

/**
 * City / state / pincode read out of a formatted address, right-to-left:
 * "…, <city>, <state> <pincode>, India". Every part is optional — an address
 * that doesn't end in a recognised Indian state yields blanks rather than a
 * guess, because a wrong city on a clinic record is worse than an empty one.
 */
export const parseIndianAddress = (
  formattedAddress?: string | null,
): ParsedIndianAddress => {
  const empty: ParsedIndianAddress = { city: "", state: "", pincode: "" };

  const parts = String(formattedAddress ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !PLUS_CODE_RE.test(part));

  if (parts.length === 0) return empty;
  if (normalizeKey(parts[parts.length - 1]) === "india") parts.pop();
  if (parts.length === 0) return empty;

  // Google keeps the PIN on the state segment ("Madhya Pradesh 452010");
  // Nominatim gives it its own ("Madhya Pradesh, 452010"). Handle both.
  let pincode = "";
  if (/^\d{6}$/.test(parts[parts.length - 1])) {
    pincode = parts.pop() as string;
  }
  if (parts.length === 0) return { ...empty, pincode };

  const tail = parts[parts.length - 1];
  pincode = pincode || tail.match(PINCODE_RE)?.[0] || "";
  const state = normalizeIndianState(tail.replace(PINCODE_RE, "").trim());
  if (!state) return { ...empty, pincode };

  // The segment before the state is the city — unless it is itself a bare
  // pincode segment, which some results split out on its own.
  const cityCandidate = parts
    .slice(0, -1)
    .reverse()
    .find((part) => part && !PINCODE_RE.test(part) && !/^\d+$/.test(part));

  return {
    city: (cityCandidate || "").replace(/\s+/g, " ").trim(),
    state,
    pincode,
  };
};
