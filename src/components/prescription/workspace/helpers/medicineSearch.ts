/**
 * Typo-tolerant ranking for the medicine picker.
 *
 * The clinic-medicine endpoint returns whatever it matched server-side; this
 * module only ever *reorders and filters what the server already sent*, so it
 * changes no API contract. Its job is to stop a one-character typo
 * ("DINAPAR" vs "Dynapar") from hiding a row the server did return, and to put
 * the likeliest answer at index 0 so Enter-to-add lands on the right medicine.
 */

import { extractAnyName, normalizeKey } from "./medicineMappers";

/** Levenshtein distance, capped — we never care about distances above `max`. */
const boundedEditDistance = (a: string, b: string, max: number): number => {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    let rowMin = i;

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + cost,
      );

      row.push(value);
      if (value < rowMin) rowMin = value;
    }

    // Every remaining row can only grow, so bail out once the best cell in this
    // row is already worse than the cap.
    if (rowMin > max) return max + 1;
    prev = row;
  }

  return prev[b.length];
};

/**
 * Typos scale with word length — one slip in a 4-letter name is a different
 * word, one slip in a 12-letter name is a typo.
 */
const allowedTypos = (length: number) => {
  if (length <= 4) return 0;
  if (length <= 7) return 1;
  return 2;
};

export type MedicineMatch = {
  /** Higher is better. */
  score: number;
  /** Character ranges in the raw name that matched, for highlighting. */
  matchedPrefixLength: number;
};

/**
 * Score one candidate name against the query. Returns `null` for a non-match.
 *
 * Tiers, highest first: exact → prefix → word-prefix → substring → typo-tolerant.
 * Shorter names win ties, so "Dynapar Tablet" outranks "Dynapar MR 8 Tablet"
 * for the query "dynapar".
 */
export const scoreMedicineName = (
  name: string,
  query: string,
): MedicineMatch | null => {
  const haystack = normalizeKey(name);
  const needle = normalizeKey(query);

  if (!haystack || !needle) return null;

  const lengthPenalty = Math.min(haystack.length, 60) / 1000;

  if (haystack === needle) {
    return { score: 100 - lengthPenalty, matchedPrefixLength: needle.length };
  }

  if (haystack.startsWith(needle)) {
    return { score: 90 - lengthPenalty, matchedPrefixLength: needle.length };
  }

  const words = haystack.split(/\s+/).filter(Boolean);
  if (words.some((word) => word.startsWith(needle))) {
    return { score: 80 - lengthPenalty, matchedPrefixLength: needle.length };
  }

  if (haystack.includes(needle)) {
    return { score: 70 - lengthPenalty, matchedPrefixLength: needle.length };
  }

  // Typo tolerance, evaluated against the whole name and against each word so
  // "DINAPAR" still reaches "Dynapar MR Tablet".
  const budget = allowedTypos(needle.length);
  if (budget === 0) return null;

  const headOfHaystack = haystack.slice(0, needle.length + budget);
  const candidates = [headOfHaystack, ...words];

  let best = budget + 1;
  for (const candidate of candidates) {
    const distance = boundedEditDistance(candidate, needle, budget);
    if (distance < best) best = distance;
    if (best === 0) break;
  }

  if (best > budget) return null;

  // A 1-typo match scores below every exact/substring tier but above nothing.
  return {
    score: 60 - best * 10 - lengthPenalty,
    matchedPrefixLength: 0,
  };
};

/**
 * Filter + rank a server-returned medicine list for the current query.
 *
 * `isValid` is injected rather than imported so this stays free of the
 * workspace's validation rules and testable on its own.
 */
export const rankMedicines = <T,>(
  medicines: T[],
  query: string,
  options: {
    isValid?: (name: string) => boolean;
    limit?: number;
    extraFields?: (medicine: T) => (string | null | undefined)[];
  } = {},
): T[] => {
  const { isValid, limit = 25, extraFields } = options;
  const trimmed = query.trim();
  if (!trimmed) return [];

  const scored: { medicine: T; score: number }[] = [];

  for (const medicine of medicines) {
    const name = extractAnyName(medicine as never);
    if (isValid && !isValid(name)) continue;

    let best = scoreMedicineName(name, trimmed)?.score ?? -1;

    // Secondary fields (category, strength) only ever match as a weak
    // substring — they must never outrank a name match.
    if (extraFields) {
      for (const field of extraFields(medicine)) {
        if (!field) continue;
        const fieldKey = normalizeKey(field);
        if (fieldKey && fieldKey.includes(normalizeKey(trimmed))) {
          best = Math.max(best, 30);
        }
      }
    }

    if (best >= 0) scored.push({ medicine, score: best });
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((entry) => entry.medicine);
};
