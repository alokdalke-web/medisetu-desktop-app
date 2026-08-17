/**
 * Stable DOM ids shared across the prescription workspace.
 *
 * The "Add medicine" button in the summary list needs to focus the medicine
 * search field, which lives in a sibling component with no shared callback
 * between them. It previously found the field with
 * `querySelector('[placeholder*="Search medicine"]')` — which broke silently
 * the moment the placeholder copy changed. Keying off an id declared in one
 * place makes that class of breakage impossible.
 */
export const MEDICINE_SEARCH_INPUT_ID = "rx-medicine-search-input";
