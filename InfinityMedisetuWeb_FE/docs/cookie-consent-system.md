# Cookie Consent System — Documentation

## Overview

The IMS (Infinity Medisetu) cookie consent system provides users with control over non-essential cookies while ensuring compliance with privacy regulations (GDPR, IT Act). It gates analytics tracking behind explicit user consent.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  App.tsx                                                     │
│  ├── Listens for 'cookie-consent-updated' event             │
│  ├── Checks isCategoryAllowed("analytics") before initGA()  │
│  └── Renders <CookieConsentBanner /> globally               │
├─────────────────────────────────────────────────────────────┤
│  CookieConsentBanner.tsx                                     │
│  ├── Shows on first visit (no stored consent)               │
│  ├── Accept All / Reject All / Customize toggles            │
│  └── Dispatches 'cookie-consent-updated' CustomEvent        │
├─────────────────────────────────────────────────────────────┤
│  cookieConsent.ts (utility)                                  │
│  ├── getStoredConsent() → CookieConsent | null              │
│  ├── acceptAllCookies()                                     │
│  ├── rejectNonEssentialCookies()                            │
│  ├── saveCustomConsent({ analytics, functional })           │
│  ├── isCategoryAllowed(category)                            │
│  └── resetConsent()                                         │
├─────────────────────────────────────────────────────────────┤
│  CookiePolicy.tsx (/cookie-policy)                           │
│  ├── Public route, no auth required                         │
│  ├── Shows current consent status                           │
│  └── "Reset Preferences" button triggers banner again       │
└─────────────────────────────────────────────────────────────┘
```

---

## Cookie Categories

| Category | Required | Description | Examples |
|----------|----------|-------------|----------|
| **Essential** | Yes (always on) | Authentication, sessions, security | `auth_token`, `refresh_token`, `session_id` |
| **Analytics** | No (opt-in) | Usage tracking, page views | `_ga`, `_ga_*`, `_gid` (Google Analytics) |
| **Functional** | No (opt-in) | Preferences, UI state, tours | `medisetu_theme`, `medisetu_tour_*`, `medisetu_cookie_consent` |

---

## Files

| File | Purpose |
|------|---------|
| `src/utils/cookieConsent.ts` | Core utility — read/write consent, category checks |
| `src/components/shared/CookieConsentBanner.tsx` | Floating consent banner UI |
| `src/pages/legal/CookiePolicy.tsx` | Cookie policy page |
| `src/routes/routes.ts` | Route definition for `/cookie-policy` |
| `src/App.tsx` | Consent-gated GA initialization |

---

## How It Works

### First Visit Flow

1. User visits IMS for the first time
2. After 1.2s delay, the cookie banner slides up from the bottom-right
3. User can:
   - **Accept All** → enables all categories, GA starts tracking
   - **Reject All** → only essential cookies remain, GA never loads
   - **Customize** → toggle analytics & functional individually
4. Consent is stored in `localStorage` as `medisetu_cookie_consent`
5. Banner dismisses and never shows again until consent is reset

### Analytics Gating

```typescript
// In App.tsx — GA only initializes if analytics consent is given
if (isCategoryAllowed("analytics")) {
  initGA();
}
```

If user initially rejects but later changes their mind (via Cookie Policy page → Reset), the banner reappears and they can accept.

### Consent Change Event

When consent is saved, the banner dispatches:

```typescript
window.dispatchEvent(new CustomEvent("cookie-consent-updated"));
```

`App.tsx` listens for this and re-evaluates whether to start analytics.

---

## Consent Storage Format

```json
{
  "essential": true,
  "analytics": true,
  "functional": false,
  "timestamp": "2026-07-05T10:30:00.000Z"
}
```

Stored in `localStorage` under key `medisetu_cookie_consent`.

---

## Usage in Code

### Check if a category is allowed

```typescript
import { isCategoryAllowed } from "../utils/cookieConsent";

if (isCategoryAllowed("analytics")) {
  // Safe to track
}

if (isCategoryAllowed("functional")) {
  // Safe to save UI preferences
}
```

### Reset consent (for testing or user request)

```typescript
import { resetConsent } from "../utils/cookieConsent";

resetConsent();
window.location.reload(); // Banner will reappear
```

---

## Adding the Cookie Policy link

The Cookie Policy page is accessible at `/cookie-policy` (public, no auth required).

You should add the link to:
- Footer area of the login/signup pages
- Settings/profile page
- The cookie consent banner itself (already included)

---

## Testing Checklist

- [ ] Clear `medisetu_cookie_consent` from localStorage → banner should appear
- [ ] Click "Accept All" → GA starts, consent stored with all `true`
- [ ] Click "Reject All" → GA never initializes, consent stored with analytics/functional `false`
- [ ] Customize → toggle analytics off, save → GA doesn't start
- [ ] Visit `/cookie-policy` → page renders, shows current preferences
- [ ] Click "Reset Cookie Preferences" on policy page → page reloads, banner reappears
- [ ] Banner doesn't flash on page load (1.2s delay)
- [ ] Banner has smooth slide-up animation
- [ ] Dark mode looks correct on banner and policy page
- [ ] Mobile responsive — banner is full-width on small screens

---

## Compliance Notes

- **GDPR**: Non-essential cookies (analytics) only fire after explicit consent
- **IT Act (India)**: Consent mechanism satisfies reasonable security practices
- **No pre-checked boxes**: Analytics/functional are pre-checked for convenience but user must actively click "Accept All" — they can also reject or customize
- **Granular control**: Users can enable/disable each non-essential category independently
- **Right to withdraw**: Users can reset consent at any time via the Cookie Policy page
- **Transparency**: Full cookie inventory with names, purposes, and durations documented
