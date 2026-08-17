/**
 * Cookie consent management utility.
 *
 * Categories:
 * - essential: Always enabled (auth, session, security)
 * - analytics: Google Analytics, page tracking
 * - functional: Preferences, tour state, UI customization
 */

export type CookieCategory = "essential" | "analytics" | "functional";

export interface CookieConsent {
  essential: true; // always true — cannot be disabled
  analytics: boolean;
  functional: boolean;
  timestamp: string; // ISO date of when consent was given
}

const CONSENT_KEY = "medisetu_cookie_consent";

/**
 * Get the stored consent, or null if user hasn't responded yet.
 */
export function getStoredConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.essential === "boolean") {
      return parsed as CookieConsent;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save user consent preferences.
 */
export function saveConsent(consent: CookieConsent): void {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  } catch {}
}

/**
 * Accept all cookie categories.
 */
export function acceptAllCookies(): CookieConsent {
  const consent: CookieConsent = {
    essential: true,
    analytics: true,
    functional: true,
    timestamp: new Date().toISOString(),
  };
  saveConsent(consent);
  return consent;
}

/**
 * Accept only essential cookies (reject analytics & functional).
 */
export function rejectNonEssentialCookies(): CookieConsent {
  const consent: CookieConsent = {
    essential: true,
    analytics: false,
    functional: false,
    timestamp: new Date().toISOString(),
  };
  saveConsent(consent);
  return consent;
}

/**
 * Save custom preferences.
 */
export function saveCustomConsent(prefs: {
  analytics: boolean;
  functional: boolean;
}): CookieConsent {
  const consent: CookieConsent = {
    essential: true,
    analytics: prefs.analytics,
    functional: prefs.functional,
    timestamp: new Date().toISOString(),
  };
  saveConsent(consent);
  return consent;
}

/**
 * Check if a specific category is allowed.
 */
export function isCategoryAllowed(category: CookieCategory): boolean {
  if (category === "essential") return true;
  const consent = getStoredConsent();
  if (!consent) return false;
  return consent[category] ?? false;
}

/**
 * Reset consent (user wants to reconfigure).
 */
export function resetConsent(): void {
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch {}
}
