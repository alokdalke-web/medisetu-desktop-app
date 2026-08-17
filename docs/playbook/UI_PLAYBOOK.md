# UI Playbook — apply this to the next screen

A fast-start summary of everything established while reworking `pages/appointment/` (list, card,
calendar, and toolbar views), so the same fixes don't need to be re-derived or re-explained screen
by screen. This is a **summary with a checklist** — it links out to the two source-of-truth docs
for full detail rather than duplicating them:

- **[`UI_CONVENTIONS.md`](./UI_CONVENTIONS.md)** — the standing rules (read before touching any UI).
- **[`UI_REMEDIATION_LOG.md`](./UI_REMEDIATION_LOG.md)** — the specific bugs found and fixed,
  written as reusable Symptom → Root cause → Fix → Reusable rule entries (58 so far).
- **[`PAGE_AUDIT_CHECKLIST.md`](./PAGE_AUDIT_CHECKLIST.md)** — the literal checkbox version of the
  "Checklist for the next screen" below, scoped for copy-paste use against a specific page's files.

---

## The things that broke, and how to check for them fast

### 1. The `slate` palette is inverted in dark mode — everything else isn't
`index.css`'s `.dark` block redefines `slate-50`…`slate-950` to their visual opposite (so bare
`text-slate-900` auto-flips to white with no `dark:` prefix). No other palette (`sky`, `indigo`,
`emerald`, `orange`, …) works this way. Any **manual** `dark:bg-slate-N` / `dark:text-slate-N` /
`dark:border-slate-N` override is therefore suspect — it's very often backwards and produces a
washed-out, low-contrast element that looks fine in a light-mode screenshot and broken in dark mode.

**Check:** `grep -n 'dark:.*slate-[0-9]' <file>` — for every hit, open `index.css` and check what
that step actually resolves to under `.dark` before trusting it. Prefer deleting the override and
either letting the bare class auto-flip, or using the semantic tokens (`bg-surface`,
`bg-surface-muted`, `text-text`, `text-text-muted`, `text-text-subtle`, `border-line`).
→ Full detail: `UI_CONVENTIONS.md` §2, `UI_REMEDIATION_LOG.md` #1–#13.

### 2. Redundant `dark:` hex pairs (a different, more common bug)
`bg-white ... dark:bg-[#111726]` where the base class already auto-flips (or where the two values
are simply duplicating what the token system already gives you). Cosmetically harmless but doubles
the maintenance surface and is usually a sign the screen predates tokenization.

**Check:** `grep -n 'bg-white\|border-slate-200\|dark:bg-\[#\|dark:text-white\|dark:border-\[#' <file>`
— a screen with **zero** `dark:` classes at all usually means it predates tokenization entirely
(not that it's already fine). → `UI_CONVENTIONS.md` §2, `UI_REMEDIATION_LOG.md` #2, #9, #11, #12.

### 3. Icon-only buttons: missing `aria-label`, under the 40px touch target
Icon buttons need `aria-label` (a `title` alone isn't reliable). The size scale is
`h-10 w-10` (40px) base/mobile → `lg:h-8 lg:w-8` (32px) once mouse precision is safe — never rely
on a `md:` fix alone, since `md` (768px) itself still requires 40px. Custom dropdowns (anything not
built on HeroUI `<Select>` or the shared `AutocompleteField` — both already carry full internal
ARIA, so adding manual `role="listbox"`/`"option"` on top of either is redundant, not additive;
check what a dropdown is built on before assuming it needs manual ARIA) need
`aria-haspopup="listbox"` + `aria-expanded` on the trigger and
`role="listbox"`/`role="option"`/`aria-selected` on the popover.
→ `UI_CONVENTIONS.md` §4 and §9, `UI_REMEDIATION_LOG.md` #15, #46.

### 4. A ticking/polling `useState` called in a parent hook re-renders more than it should
If a periodic value (clock tick, poll, scroll position) is only consumed by one child subtree, put
the `useState` + effect **inside that child component**, not in a shared hook called from a parent.
Hook state always belongs to whichever component function is executing when the hook runs — nesting
hooks doesn't scope the re-render to part of the JSX. → `UI_REMEDIATION_LOG.md` #16.

### 5. Dead state / orphaned "menu" buttons that don't do anything
A setter prefixed `_` to dodge the unused-var linter, or a modal that's rendered but whose "open"
callback is never actually invoked, is a signal the whole feature branch around it is dead, not
just that one variable. Trace it before assuming it's harmless. → `UI_REMEDIATION_LOG.md` #10.

### 6. `bg-white` is a third, different color trap — it never inverts, anywhere
Unlike `slate` (item 1, auto-inverts) and redundant `dark:` pairs (item 2, harmless duplication),
`.dark { --color-white: #ffffff; }` is intentional in this codebase (so `dark:text-white` reliably
means "force white"). A bare `bg-white` with no `dark:` pairing is **not** "probably fine like
slate" — it is permanently, unconditionally white in every theme, and looks confidently correct
(not washed-out) so it's easy to miss on a visual scan.

**Check:** `grep -n 'bg-white\b' <file>` (word boundary — excludes `bg-white/NN` opacity variants)
and verify each hit has a `dark:` pair. **Check shell/layout components first** — `Layouts/`,
`Sidebar`, `Header`, any `*Skeleton` component — a miss there silently breaks every page that
renders inside it, even pages whose own content is already correctly tokenized.
→ `UI_REMEDIATION_LOG.md` #23.

### 7. Animating text/icon `color` through a theme crossfade looks broken, not smooth
If you add a transition for smoother dark/light switching, don't include `color`/`fill`/`stroke`.
Any crossfade between two text colors passes through a low-contrast blended midpoint — that reads
as "washed out and hard to read," not smooth, regardless of duration. Only animate
`background-color`/`border-color`/`box-shadow`; let foreground color snap instantly.
→ `UI_REMEDIATION_LOG.md` #22.

### 8. A fixed tile count that doesn't divide evenly (5, 7, …) — don't grid it mid-range
Don't put a multi-row grid at an intermediate breakpoint for a count like 5 — every column choice
(2, 3, 4) either orphans a lone tile or stacks unevenly (3+2, 4+1) across a wide range of real
tablet/laptop widths. **The standing default**: a single-row horizontal swipe strip
(`flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2`) at every width below the
point where all tiles genuinely fit in one row, then straight to `grid-cols-N` there — no
intermediate grid step at all. See `AppointmentStatCards.tsx`/`PatientStatCards.tsx`/`PaymentStatCards.tsx`.
→ `UI_CONVENTIONS.md` §9, `UI_REMEDIATION_LOG.md` #1, #24.

### 10. Don't use `scrollbar-hide` on a swipe strip — but don't leave it permanently visible either
A horizontally-scrollable stat-card strip (item 8) relies on a partially cut-off trailing card as
its "there's more, scroll" affordance — `scrollbar-hide` removes the only other cue a desktop/mouse
user would notice, so never use it outright. But a permanently-visible scrollbar under a clean card
row is unwanted clutter at rest — use a scrollbar that's transparent until `hover`/`active`:
`[scrollbar-color:transparent_transparent] hover:[scrollbar-color:#9ca3af_transparent]
active:[scrollbar-color:#9ca3af_transparent]` plus
`[&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-gray-400`
(track stays `h-1.5`/transparent so nothing shifts when the thumb fades in). Reserve an
always-visible scrollbar for wide data surfaces like tables. → `UI_CONVENTIONS.md` §9,
`UI_REMEDIATION_LOG.md` #28.

### 11. A `condition ? "flex" : "hidden"` panel needs an explicit `lg:flex` restated alongside it
A mobile-collapsible filter panel (item 9) that's `mobileFiltersOpen ? "flex" : "hidden"` defaults
to hidden — if the desktop override only adjusts `lg:flex-row`/`lg:flex-wrap`/`lg:w-auto` without
also restating `lg:flex`, the panel silently **disappears on desktop by default**, since nothing
beats the ternary's `hidden` at wide breakpoints. Every responsive override on a conditionally-
hidden element must restate the display value itself, not just layout details.
→ `UI_REMEDIATION_LOG.md` #29.

### 12. A fourth color trap: raw `bg-{color}-50`/`-100` status chips with zero dark handling
Unlike `slate` (item 1, auto-inverts) or `bg-white` (item 6, intentionally frozen), ordinary
Tailwind colors (`yellow`, `orange`, `red`, `blue`, `green`, …) have **no `.dark` remap at all** —
a `bg-yellow-50` badge is a near-white tint that reads as a jarring bright patch on a dark page, not
just "a bit washed out." **Check:** `grep -n 'bg-\(red\|orange\|yellow\|green\|blue\|purple\|pink\)-\(50\|100\)\b'`
with no adjacent `dark:` pair. **Fix:** use the alpha-based pattern instead —
`bg-{color}-500/10 text-{color}-700 dark:text-{color}-400 border-{color}-500/20` — a translucent
background composites correctly against either theme's page color, so it needs no `dark:` override
of its own. → `UI_REMEDIATION_LOG.md` #30.

### 13. A table can look consistent while behaving differently — check the shape, not just the theme
"Looks similar at a glance" isn't the same bar as "behaves the same." A 4th table
(`NoShowTable.tsx`) had correct tokens and header styling but a non-clickable row (icon-button-only
navigation), a hand-rolled identity icon instead of `Avatar`, a bespoke skeleton, and a full custom
illustration for the empty state instead of an inline `<tr>` — none of which a static screenshot
review would catch. **Copy the canonical table shape** (`UI_CONVENTIONS.md` §1): outer card wrapper
with `BottomControls` inside it, always-visible thin scrollbar, `SkeletonBlock`-shaped loading rows,
inline empty-state row, whole-row click + keyboard handling, and `Avatar`-based identity cells — not
just the color/spacing tokens. → `UI_REMEDIATION_LOG.md` #31.

### 14. A shared component's own default styling can carry the color-trap bugs too
Checking a screen for `bg-white`/`dark:.*slate-[0-9]` isn't enough if the screen renders a shared
component (`SearchField`, etc.) that has never been tokenized itself — a consumer that always
passes its own `classNames` override never exposes the bug, so it lingers invisibly until a new
consumer skips the override, as happened with `SearchField`'s own hardcoded `bg-white`/`slate-*`
defaults. When auditing, also check the shared components a page renders, not just the page's own
usage of them. → `UI_REMEDIATION_LOG.md` #34.

### 15. Not every dark-mode bug is fixable with a `dark:` class — and check every consumer before changing a shared default
Two lessons from the Admin Dashboard pass (a large, high-risk file worked through step by step, not
skipped for its size): (1) chart libraries like recharts take color **props** (`stroke`, `tick.fill`),
not CSS classes — `dark:` variants don't apply to them at all, so a genuinely broken chart-chrome
color needs the existing `useTheme()` hook wired in to pick a light/dark pair at render time, the
same category of "beyond a className edit" fix as #16/#22. (2) Before removing or changing a shared
component's default/fallback styling, grep for **every** consumer, not just the one you're actively
fixing — a "harmless-looking" fallback can be load-bearing for a caller outside your current task,
and removing it can silently break pages you never opened. → `UI_REMEDIATION_LOG.md` #39.

### 9. A collapsible mobile filter panel must wrap from the same breakpoint its children do
The standard "collapse behind a mobile Filters button" panel is
`flex flex-row flex-wrap items-center gap-3 lg:w-auto` — **not** `flex-col ... lg:flex-row`.
Individual filters are typically `w-full sm:w-[Npx]` (fixed width from `sm` so several can share a
row); a panel that only allows wrapping from `lg` leaves a dead `sm`-`lg` range (640-1023px) where
filters are sized to sit side by side but the panel forces them onto separate rows anyway.
`flex-row flex-wrap` at the base breakpoint is safe for narrow phones too — 100%-width children
still wrap to their own row. → `UI_CONVENTIONS.md` §9, `UI_REMEDIATION_LOG.md` #26.

### 16. Every detail/create/edit page needs `PageBackNav`, not a hand-rolled breadcrumb
A page one level deep in a flow (`New Appointment`, `Reschedule`, `Appointment Details`,
`Add Patient`, …) needs a **back button + breadcrumb trail**, and it must be the shared
`components/shared/PageBackNav` component (`backTo` + `crumbs`), not a bespoke `<nav>` of
`Link`s/`<button onClick={() => navigate(...)}>` — every hand-rolled version found so far had its
own bug: unstyled/undiscoverable back affordance (no back arrow at all, just a "Patients" text
link), a broken `dark:` pairing on the breadcrumb text, or — the sneaky one — a last breadcrumb
crumb that links to the **current page itself** (e.g. "Appointment Details" linking to
`/appointment/${id}`, the page you're already on). `PageBackNav`'s own convention is: `backTo` for
the actual back-navigation target (often per-caller-aware, e.g. reschedule returns to the specific
appointment, not a generic list), and the crumb list's **last item has no `to`** so it never
becomes a self-link. **Check:** `grep -n 'FiChevronRight\|breadcrumb' <file>` — a hit that isn't
already `<PageBackNav` is a page that needs this fix. → `UI_REMEDIATION_LOG.md` #46, #50, #51, #52, #54.

### 17. Form text inputs: always `InputField`/`TextareaField`/`SelectField`/`CitySelector` — never a raw `<input>`
Every text-entry field in a react-hook-form-backed form should go through one of these four shared
`components/shared/` primitives, not a hand-rolled `<input>`/`<textarea>` with its own `classNames`.
They already carry the label/error/validation wiring (`Controller`, `isInvalid`, `errorMessage`,
`aria-invalid`) and the canonical visual contract: `labelPlacement="outside-top"`, `variant="bordered"`,
`radius="full"` (text inputs) — border `border-border-color` (auto-inverts, don't hardcode a `dark:`
pair for it), focus/hover state via `data-[hover=true]:border-primary/60` /
`data-[focus=true]:border-primary`. If a screen needs a field these don't cover, extend the shared
component (add a prop) rather than hand-rolling a one-off styled input — a one-off will drift from
the contract the moment a token changes.

**This exact rule was validated by a real bug**: `InputField.tsx`/`TextareaField.tsx`/`CitySelector.tsx`
all had `dark:!text-slate-100` (or `dark:text-slate-100`) as their dark-mode text-color override.
Per item 1 (slate auto-inverts in `.dark`), `--color-slate-100` flips from a near-white
light-mode value to `#151c2d` — a near-black navy — under `.dark`. That made every text
input/textarea/city-search field's typed text nearly invisible in dark mode, app-wide, because
these are the shared primitives nearly every form uses. Fixed by replacing the redundant override
with the `text-text` token (which is *designed* to invert correctly, unlike hand-picking a raw
slate step and assuming it stays light). **The same exact bug shape was also found, not yet fixed,
in ~20 other files** that hand-roll their own HeroUI `Input`/`Autocomplete` styling instead of using
the shared components (`pages/auth/{Login,Signup,SignupEmail,NewPass,ResetPass,SetPassword}.tsx`,
`pages/profile/{Profile,ClinicEdit,ClinicAvailability,NoShowPolicySettings}.tsx`,
`pages/patient/InlineAddPatientForm.tsx`, `pages/dashboard/superadmin/BannerFormPage.tsx`,
`pages/user/components/lab/CreateLabModal.tsx`, `Layouts/OnboardingLayout.tsx`,
`components/onboarding/{DoctorAvailabilityStep,VerificationSidebar,ReviewSubmitStep,Overview,ServicesPricingStep}.tsx`,
`components/common/FullScreenVideoLoader.tsx`) — **not fixed yet**, flagged here for the next pass
through each of those screens; this is exactly the kind of bug this item's "always use the shared
primitive" rule prevents from recurring. **Check:** `grep -rn 'dark:!\?text-slate-100\b\|dark:!\?text-slate-50\b'`
— any hit is a near-certainly-inverted, near-invisible dark-mode text color. → `UI_REMEDIATION_LOG.md` #55.

### 18. Auto-focus the first field when a create-flow form opens
A create/add page (not edit — edit forms are usually reached with intent to review first) should
focus its first meaningful input on mount, not leave the user to click in. The established pattern
(`AddPatient.tsx`): a `focusField(ref, selector, delay)` helper that does
`ref.current?.querySelector(selector)?.focus()` inside a `window.setTimeout`, called from a
`useEffect` on mount with a short delay (200ms in the existing example — enough for the field's
own mount/animation to settle first, avoiding a focus call that lands before the element is
interactive). Reuse this shape for any new create-flow page rather than inventing a fresh one.
→ `UI_REMEDIATION_LOG.md` #55.

### 19. Dashboard widget rows: both halves of the height contract, and no data-hiding `slice()`
A row of cards needs `items-start` on the grid (short content → natural height, no stretched
neighbours) **and** a `max-h-*` + `overflow-y-auto [scrollbar-width:thin]` cap inside each list
widget (long content → scrolls in place). Never cap a card's height by truncating its data with
`slice(0, N)` — everything stays reachable by scroll. A card designed for a narrow sidebar rail
(donut + side legend, etc.) breaks when placed alone across a wide column — pair it into a
`md:grid-cols-2`/`xl:grid-cols-3` band instead. → `UI_REMEDIATION_LOG.md` #61.

### 20. Popovers near the right viewport edge; role dashboards; fallback-masked API errors
Three quick ones from the reception-dashboard pass: (1) any `absolute left-0` popover/dropdown
clips off-screen when triggered from a right-most column — give the shared component a defaulted
`align` prop (check all consumers, per item #15) and pass `align="right"` there
(→ log #62). (2) An operational "today" dashboard doesn't get decorative trend sparklines or a
two-value donut — use live micro-context lines, real progress bars, tappable shortcut tiles, and
replace a two-value chart with the worklist of the items it summarizes (→ log #63). (3) If a
screen has a client-side fallback for a stats API, "derived numbers fine, API-only numbers zero"
means the endpoint is 500ing behind the fallback — check the network tab before touching styles
(→ log #64).

---

## Folder-structure pattern for a large view file

When a `pages/<feature>/<View>.tsx` grows past a few hundred lines with multiple layouts or several
inline helper components, split it the way `AppointmentListView.tsx` and `Appointment.tsx` were
split:

```
pages/<feature>/
├─ <View>.tsx                    # thin: owns state/queries, composes the pieces below
├─ components/<view-name>/       # one component per file, grouped by what renders together
└─ helpers/<view>Formatters.ts   # non-JSX logic (label/color lookups, formatters) — not in a component
```

New prop types go in `src/types/<domain>/<topic>.ts`, added to the existing barrel `index.ts`
rather than declared inline in a component. See `UI_CONVENTIONS.md` §1 for the two worked examples
(`components/list/` and `components/toolbar/`) with full before/after file trees.

---

## Checklist for the next screen

1. `grep -n 'dark:.*slate-[0-9]\|bg-white\b\|border-slate-200\|dark:bg-\[#\|dark:text-white'` across
   the screen's files. Fix per items 1, 2, and 6 above.
2. **Check the shell first, not just the page**: `Layouts/MainLayout.tsx`, `components/shared/Sidebar.tsx`,
   and any `*Skeleton` component wrap every screen — a `bg-white` miss there (item 6) breaks pages
   that are otherwise already fixed. Don't assume "the page looks fine" means the chrome around it
   does too.
3. Check every icon-only `<button>` for `aria-label` and the 40px/32px size scale (item 3).
4. Check every custom dropdown/listbox for the `aria-haspopup`/`role` set (item 3).
5. If the screen has a periodic tick/poll, confirm the state lives in the component that actually
   needs it, not a parent (item 4).
6. If a file is pushing 500+ lines or has several inline sub-components, split it per the folder
   pattern above before adding more to it.
7. If the screen is one level deep in a flow (detail/create/edit page), it needs `PageBackNav`
   (item 16) — not a hand-rolled breadcrumb.
8. Check every component file for inline `type X = {...}`/`interface X {...}` props declarations —
   per `CLAUDE.md`'s hard rule, these belong in `src/types/<domain>/`, extending that domain's
   existing barrel `index.ts` rather than starting a new one.
9. Run `npm run lint` and `npx tsc -b` — both must be clean. This repo has no Prettier; never run it.
9a. If the screen has a widget/card row: `items-start` on the row + `max-h` internal scroll on each
   list widget, no `slice()` truncation (item 19); popovers triggered from the right-most column
   need `align="right"` (item 20); all-zero API-only stats next to working derived counts = a
   masked endpoint failure, not a UI bug (item 20).
10. Add a new entry to `UI_REMEDIATION_LOG.md` for anything you fix that's likely to recur elsewhere
    (that's what makes this playbook keep paying off on the *next* screen after this one).
11. **Nothing is verified until it's committed and pushed.** Local `tsc -b`/`eslint` passing doesn't
    mean it's visible anywhere real — if you're checking a fix against a deployed environment
    (staging, etc.), confirm the branch was actually committed and pushed first, not just edited.
