# Frontend UI Conventions & Structure Reference

A single reference for building UI in `InfinityMedisetuWeb_FE` so that every screen looks and
behaves like one product across all devices. **Read this before adding a page, a component, or
any styling.** It complements `CLAUDE.md` (architecture) — this doc is about UI consistency,
responsiveness, and where files go.

---

## 1. Folder structure

```
src/
├─ Layouts/            # App shells (MainLayout, OnboardingLayout, PatientLayout, ProfileLayout)
├─ routes/             # AppRoutes.tsx, routes.ts, AuthRoute.tsx (route gating)
├─ pages/<feature>/    # One folder per domain feature (appointment, dashboard, pharmacy, lab, …)
│   ├─ <Feature>.tsx        # top-level page(s)
│   ├─ components/          # components used ONLY by this feature
│   ├─ hooks/  helpers/     # feature-local logic
│   └─ types.ts             # feature-local types (only if not shared)
├─ components/
│   ├─ shared/         # cross-feature primitives (Card, AppButton, StatusChip, form fields, Modals/)
│   ├─ common/         # page scaffolding + generic table system (PageContainer, PageHeader, CommonTable)
│   └─ <feature>/      # cross-cutting feature components used outside pages/
├─ redux/api/          # RTK Query slices (*Api.ts) — register new ones in apiRoot.ts
├─ schemas/            # Zod schemas mirroring backend feature names
├─ types/<domain>/     # shared request/response + domain types (barrel index.ts)
├─ services/           # socket.ts and other cross-app services
├─ hooks/              # cross-app hooks
└─ index.css           # SINGLE source of truth for design tokens (@theme + .dark)
```

### Placement rules

- **Feature-only component** → `pages/<feature>/components/`.
  **Used by many features** → `components/shared/` (a primitive) or `components/<feature>/`
  (feature-specific but used outside `pages/`).
- **Page scaffolding** is always `components/common/PageContainer` + `PageHeader`.
- **Shared/domain types** live in `src/types/<domain>/` with a barrel `index.ts` — NOT inline in
  the `*Api.ts` file, and NOT in a sibling `*Api.types.ts`.
- **New API slice** → build on `redux/api/baseQueryWithAutoLogout.ts` (never raw `fetchBaseQuery`)
  and register it in `redux/api/apiRoot.ts` (or explicitly in `store.ts`), or its reducer and
  middleware won't be wired.
- **No path alias** is configured for `src/` — imports are relative.
- **A large view file with multiple layouts/sub-widgets** gets its own subfolder under
  `pages/<feature>/components/<view-name>/`, one component per file, grouped by what they render
  together — not one flat 900-line file. Non-JSX logic (formatters, color/label lookups) goes in
  `pages/<feature>/helpers/`, not inside a component file. See the worked example below.

**Worked example** — `pages/appointment/` originally had one ~950-line `AppointmentListView.tsx`
holding both the table and card layouts plus five inline helper components. It's now:

```
pages/appointment/
├─ AppointmentListView.tsx          # thin dispatcher: owns the shared draft-indicator
│                                     state, renders <AppointmentTable> or <AppointmentCardGrid>
├─ components/list/
│  ├─ AppointmentTable.tsx          # the "list" layout (table)
│  ├─ AppointmentCardGrid.tsx       # the "card" layout (grid)
│  ├─ PaymentCell.tsx               # table-only cell renderer
│  ├─ BookingSourceCell.tsx         # table-only cell renderer
│  ├─ BottomControls.tsx            # shared pagination/rows-per-page footer
│  ├─ DraftDataIndicator.tsx        # shared small badge
│  └─ SkeletonBlock.tsx             # shared shimmer placeholder
└─ helpers/
   └─ appointmentListFormatters.ts  # doctorDisplayName, toTimeRange, getPaymentModeMeta,
                                     # getBookingSourceMeta, isTerminalAppointmentStatus
```

Shared prop shapes (`AppointmentListSharedProps`, `AppointmentTableProps`,
`AppointmentCardGridProps`, `BottomControlsProps`, `BookingSourceMeta`, `PaymentModeMeta`) live in
`src/types/appointment/list.ts`, extending the existing barrel rather than starting a new one.

The same pattern was then applied one level up to `pages/appointment/Appointment.tsx` itself
(the page that renders `AppointmentListView`/`AppointmentCalendarView`), which had the stat-cards
row, the real-time queue status bar, and the entire filter/view toolbar written inline:

```
pages/appointment/
├─ Appointment.tsx                    # page: owns all state/queries, composes the pieces below
└─ components/toolbar/
   ├─ AppointmentToolbar.tsx          # search, mobile-filters toggle, date-nav, status
   │                                    dropdown, view toggle, New Appointment button
   ├─ AppointmentStatCards.tsx        # the 5-tile stat row
   ├─ QueueStatusBar.tsx              # real-time "Next"/"Delay" status bar
   ├─ StatusFilterDropdown.tsx        # the custom status listbox (used by the toolbar)
   ├─ ViewToggle.tsx                  # List/Grid/Calendar icon-button group
   ├─ StatCard.tsx                    # single stat tile
   └─ IconBtn.tsx                     # shared square icon button (view toggle, etc.)
```

New prop shapes (`QueueStatusBarProps`, `AppointmentStatCardsProps`, `ViewToggleProps`,
`StatusFilterDropdownProps`, `AppointmentToolbarProps`) live in a new
`src/types/appointment/toolbar.ts`, added to the barrel alongside `list.ts` rather than inlined.

### The canonical `<Feature>Table.tsx` shape — copy this, don't reinvent it

Four screens now share one desktop-table shape (`AppointmentTable.tsx`, `PatientTable.tsx`,
`TransactionTable.tsx`, `NoShowTable.tsx`). Treat these as the reference implementation for any new
table, not just prior art to glance at — a table that drifts from this shape (found on the No-Show
page before its harness pass, see `UI_REMEDIATION_LOG.md` #31) reads as visually consistent at a
glance but *behaves* differently, which is a worse inconsistency than a color mismatch because it
isn't visible in a static screenshot.

- **Outer wrapper**: `overflow-visible rounded-lg border border-line bg-surface
  shadow-[0_10px_30px_rgba(15,23,42,0.05)] dark:shadow-none`, containing the scroll wrapper, the
  `<table>`, and the table's own `BottomControls` — all three in one card, not split across
  page-level markup.
- **Scroll wrapper**: `overflow-x-auto pb-1` + the visible thin-scrollbar utility (§9) — a data
  grid keeps its scrollbar always visible, unlike a stat-card swipe strip.
- **`<thead>`**: `bg-surface-muted`, header row `border-b border-line`, header cells
  `text-[13px] font-bold text-text-muted`.
- **`<tbody>`**: `divide-y divide-line`.
- **Loading state**: 6 identical `<tr>`s, each a single `<td colSpan={N}>` containing
  `<SkeletonBlock className="h-10 w-10 rounded-full" />` (an avatar-shaped placeholder) beside two
  stacked `SkeletonBlock` lines — **not** a bespoke skeleton shaped like the real columns. Every
  table's `components/list/SkeletonBlock.tsx` is the same three-line component
  (`animate-pulse rounded-lg bg-surface-muted`); copy it rather than inventing a different shimmer.
- **Empty state**: a single inline `<tr><td colSpan={N} className="h-[320px] text-center
  text-text-subtle">No <things> found...</td></tr>` — **not** a separate illustration/SVG
  component swapped in at the page level. A full-page empty illustration is a bigger visual
  statement than the other three tables make for the same situation, and it also means the empty
  state doesn't respect the table-vs-card view toggle the way the inline row does automatically.
- **Row-as-link**: the whole `<tr>` is `cursor-pointer transition hover:bg-surface-muted`, with
  `onClick` going to the row's own "view details" navigation — not just an icon button in the
  Action column. Add `role="button" tabIndex={0} aria-label="..." onKeyDown={...}` (Enter/Space) for
  keyboard reachability (`TransactionTable.tsx` has the fullest version of this; the others should
  eventually catch up to it too). **If a row's primary action is "view details" and there's nothing
  else the row needs a dedicated icon button for, don't add one** — a per-row icon button doing the
  exact same thing the row-click already does is a redundant, easily-missed-in-review duplicate
  control (see `UI_REMEDIATION_LOG.md` #25 for a keyboard-unreachable version of this same mistake).
  Only keep a dedicated icon button when it's a genuinely different action (e.g. `PatientTable`'s
  row navigates to *view*, but its Edit icon button is a distinct action, not a duplicate).
- **Identity cells** (the primary "who is this row about" column, and any secondary
  person/entity column like "Doctor"): a HeroUI `<Avatar name={...} src={...} size="sm" />` next to
  stacked name/detail text — `bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30
  dark:text-emerald-300` for the primary entity, `bg-surface-muted text-text` for a secondary one
  like doctor — not a hand-rolled colored circle with a static react-icon glyph. The `Avatar`'s
  built-in name-initials fallback means every row gets a consistent identity affordance even
  without a `src` image, which a fixed icon can't give you.

Feature-specific decisions still vary column-to-column (badges, status chips, formatting) — this
rule is about the table's *scaffolding and interaction behavior*, not forcing every column to look
identical. One exception worth calling out explicitly: **any status/count "chip" in a table cell
should use the same visual pattern as `components/shared/StatusChip.tsx`** — a borderless HeroUI
`Chip variant="dot"` (`h-auto rounded-md border-none px-3 py-1.5`, `text-xs font-medium` content,
`w-1.5 h-1.5 !bg-current` dot) — even when the screen's status *values* don't fit `StatusChip`'s
built-in mapping and it can't be reused directly. Build a sibling component with the same
`classNames` shape and a different color-per-status table, rather than a differently-shaped chip
(bordered pill, icon-led, etc.). See `UI_REMEDIATION_LOG.md` #32.

### The canonical `<Feature>CardGrid.tsx` shape

A screen's card/grid layout (mobile cards, or an explicit grid view toggle) has its own separate
reference shape from the table — auditing the table against `AppointmentTable.tsx` doesn't
automatically mean the card view matches `AppointmentCardGrid.tsx` too; check both, against their
own respective references (see `UI_REMEDIATION_LOG.md` #33, where the No-Show table was fixed in
one pass and the card view still had every one of the same category of gap in a later pass).

- **Whole card is the click target**: `role="button" tabIndex={0}` on an inner wrapper `<div>`
  (not the outer bordered card, so the border/shadow stays on a plain container) with
  `onClick`/`onKeyDown` (Enter/Space) going to the same "view details" navigation — no separate
  button inside the card duplicating it (same rule as the table's row-click, §1 above).
- **Header**: `Avatar` + stacked name/detail text, exactly like the table's identity cell.
- **A "strip" for the secondary entity** (e.g. doctor): `rounded-xl bg-surface-muted px-4 py-3`
  containing its own `Avatar` + stacked text — a visually distinct block, not just another line of
  plain text in the card body.
- **An info strip** for 1-2 key-value pairs (e.g. payment mode/status, or appointment date/time):
  `rounded-lg bg-surface-muted px-3 py-2` with each value under an `text-[11px] font-medium
  text-text-muted` label.
- **Bottom row**: a small colored status dot + text on the left, a status chip on the right —
  `flex items-center justify-between`.
- **Skeleton** shaped like the real card's actual sections (header row, strip block, info block),
  not a generic stack of unrelated-width lines.
- **Empty state**: a bordered card (`rounded-2xl border border-line bg-surface p-10 text-center
  text-text-subtle`), matching the table's empty-state weight — not a bare paragraph of text.
- **Pagination**: mount the feature's own `BottomControls` with `variant="plain"` under the grid
  (`BottomControls` needs a `variant?: "card" | "plain"` prop — `"card"` keeps the `border-t`
  divider for use inside the table's card, `"plain"` drops it since the grid has no single
  surrounding card to divide from). Don't skip pagination just because the table view already has
  it — the grid view needs its own instance too.

---

## 2. Design tokens (colors, spacing, radius)

`src/index.css` `@theme { }` is the **only** place colors are defined. Never hardcode `slate-*`,
`gray-*`, `bg-white`, or `#hex` arbitrary values in components — use token-backed classes so
light and dark mode "just work":

| Purpose | Use |
|---|---|
| Page background | `bg-background`, `bg-background-secondary` |
| Card / panel surface | `bg-surface`, inset strips `bg-surface-muted` |
| Text | `text-text`, secondary `text-text-muted`, subtle `text-text-subtle` |
| Borders | `border-line` (or the legacy `border-border-color`) |
| Brand | `bg-primary`, `text-primary`, `hover:bg-primary-hover`, `bg-secondary` |
| Status chips | `StatusChip` component + `--color-status-*` tokens |
| Banners | `--color-banner-p0` … `--color-banner-p3` |

The semantic surface/text tokens (`bg-surface`, `text-text`, `border-line`, …) exist in
`index.css` `@theme` with matching dark values — prefer them over raw palette classes.

### ⚠️ The `slate` palette is inverted in dark mode — nothing else is

`index.css`'s `.dark` block doesn't just define the semantic tokens above; it also **redefines
every `--color-slate-*` step (50 through 950) to its visual opposite** (`slate-50` → near-black,
`slate-900` → near-white, etc.), so that plain `text-slate-900`/`bg-slate-50` auto-flip correctly
in dark mode **without any `dark:` prefix at all**. No other Tailwind color family (`sky`,
`indigo`, `purple`, `emerald`, `orange`, …) is redefined this way — those stay their normal values
in both themes.

This makes any **manual `dark:` override that names a `slate-N` step** actively dangerous, because
the mental model "higher step = darker" is backwards here:

- `bg-slate-50 ... dark:bg-slate-900/40` — looks like "light bg in light mode, dark overlay in dark
  mode." In this theme, `slate-900` in dark mode is near-white, so this renders as a **washed-out,
  near-invisible pale box** — this exact bug produced an unreadable "Walk-In" badge on the
  appointment list (see `UI_REMEDIATION_LOG.md` #13).
- `dark:hover:text-slate-300` on a light-mode-dark icon — `slate-300` in dark mode is a **dark**
  blue-gray, so the hover state becomes *less* visible than the resting state.

**The fix is almost always to delete the `dark:slate-N` override and either (a) rely on the plain
`slate-N` class's automatic flip, or (b) use the semantic tokens** (`bg-surface-muted`, `text-text`,
`text-text-muted`, `border-line`) instead, which is the more explicit and greppable choice. Before
trusting any `dark:bg-slate-N` / `dark:text-slate-N` / `dark:border-slate-N` you find in existing
code, open `index.css` and check what that step actually resolves to under `.dark` — don't assume
vanilla Tailwind semantics.

### ⚠️ A fourth trap: raw `bg-{color}-50`/`-100` accent/status chips with no dark handling at all
Unlike `slate` (auto-inverts) or `bg-white` (intentionally frozen, see below), ordinary Tailwind
colors — `yellow`, `orange`, `red`, `blue`, `green`, `purple`, … — have **no `.dark` remap
whatsoever**. A `bg-yellow-50 text-yellow-700` status chip with no `dark:` pairing isn't "a bit
washed out" in dark mode, it's a near-white tint sitting as a jarring bright patch on a dark page.
This showed up on the No-Show page's status chips, count badges, and avatar-icon circles (see
`UI_REMEDIATION_LOG.md` #30).

**Check:** `grep -n 'bg-\(red\|orange\|yellow\|green\|blue\|purple\|pink\)-\(50\|100\)\b'` with no
adjacent `dark:` pair. **Fix:** use an alpha-based background instead of a light palette step —
`bg-{color}-500/10 text-{color}-700 dark:text-{color}-400 border-{color}-500/20`. The translucent
background composites correctly against either theme's page color without needing its own `dark:`
override; only the text color (which needs to stay legible against that translucent tint on a dark
background) needs the `dark:text-{color}-400` pairing.

---

## 3. Dark mode

Dark mode is **class-based** — the `.dark` class on `<html>` (via `@custom-variant dark` in
`index.css`), not `prefers-color-scheme`.

- **Read/toggle theme** with the existing hook `src/hooks/useTheme.ts` — `const { isDark, toggleTheme } = useTheme()`.
  It persists to `localStorage` (`medisetu-theme`) and syncs all components via `useSyncExternalStore`.
  Do **not** add another theme mechanism.
- **How it actually works:** the `.dark` block *remaps the CSS variables themselves*
  (`--color-slate-50`, `--color-surface`, …). Since Tailwind v4 resolves `bg-slate-50` to
  `var(--color-slate-50)`, a plain `bg-slate-50` / `bg-surface` **already switches to its dark value
  automatically — no `dark:` prefix needed.**
- Therefore a `dark:bg-[#111726]` next to a `bg-white`/`bg-slate-50` is almost always **redundant**.
  In a conservative sweep, swap `bg-white` → `bg-surface` and delete the redundant `dark:` hex — the
  render stays identical in both themes.
- Never introduce new raw `dark:bg-[#...]` hex; use a token so there's one source of truth.
- `.login-light-mode` and `.clinic-edit-dark-fix` in `index.css` are intentional escape hatches,
  not bugs — don't "clean them up".

---

## 4. Accessibility (a11y)

- All interactive controls must be real `<button>`/`<a>` or have `role` + keyboard handlers.
  Icon-only buttons need an `aria-label`.
- Modals/drawers: `role="dialog"`, `aria-modal="true"`, an `aria-label`/`aria-labelledby`, close on
  `Escape`, and trap/return focus (see the mobile drawer in `Layouts/MainLayout.tsx` for the pattern).
- Inputs need associated `<label>`s (the shared form fields handle this — prefer them).
- Maintain visible focus states; never remove focus outlines without a replacement.
- Color is never the only signal — pair status color with text/icon (`StatusChip` already does this).
- Respect `prefers-reduced-motion` (see Motion below).

---

## 5. UI states (loading / empty / error)

Every data-driven view must handle all four states — never show a blank screen while loading or
on error:

- **Loading** — route-level skeletons live in `Layouts/MainLayout.tsx` (`MainLayoutSkeleton` by
  path variant); for tables use `CommonTableLoading`. Prefer skeletons over spinners for content.
- **Empty** — use `CommonTableEmpty` (or an equivalent friendly empty state with an action), not a
  bare "No data".
- **Error** — use `CommonTableError`; surface retry. Never swallow errors silently.
- **Success** — the content itself.

The `components/common/CommonTable` system bundles Loading/Empty/Error/Pagination — use it rather
than re-implementing these states per screen.

---

## 6. Forms & validation

- **react-hook-form + Zod** via `@hookform/resolvers`. Schemas live in `src/schemas/<feature>.ts`,
  mirroring backend feature names.
- Use the shared form fields (`InputField`, `SelectField`, `DatePickerField`, `DateRangeField`,
  `CheckBox` in `components/shared/`) — they wire label, error text, and styling consistently.
- Show inline field errors from the resolver; disable submit while pending; give success/failure
  feedback via toast (below).

---

## 7. Feedback & notifications

- **Toasts**: use HeroUI's `addToast` (`import { addToast } from "@heroui/react"`) for transient
  success/error feedback — see `hooks/useSubscriptionCheckout.ts` for the established usage. Don't
  hand-roll toast components.
- **Confirmations / destructive actions**: use the shared `Modals/` dialogs; never delete or
  irreversibly change data without an explicit confirm step.
- Keep messages short and human; mirror the backend's message where one is returned.

---

## 8. Motion & animation

- Keyframes/animations are defined centrally in `src/index.css` (e.g. `bannerEnter`, `shimmer`,
  toast entrance) — reuse those rather than adding ad-hoc inline animations.
- **Always** respect reduced motion: `index.css` already has `@media (prefers-reduced-motion: reduce)`
  blocks — any new animation must be disabled/shortened under that query.
- Keep transitions subtle and fast (150–300ms); animation is polish, never a blocker for content.
- **Theme switching is globally smoothed** by a `@layer base` rule in `index.css`
  (`transition-property: background-color, border-color, box-shadow`, 200ms) so toggling dark/light
  doesn't flash. It's deliberately inside `@layer base`, not left unlayered — Tailwind v4's cascade
  layers mean an unlayered rule would win over *every* utility class's own transition, breaking
  `transition-transform`/`duration-*` utilities elsewhere. If you add new raw CSS for
  animation/transitions, always wrap it in the matching `@layer` (`base`/`components`/`utilities`)
  rather than leaving it unlayered, unless you specifically intend it to override every utility.
  **`color`/`fill`/`stroke` (text and icon color) are deliberately excluded** — animating text
  color through a crossfade always passes through a low-contrast blended midpoint, which reads as
  "washed out and hard to read," not smooth. Text/icons snap instantly on theme change; only
  backgrounds/borders fade. See `UI_REMEDIATION_LOG.md` #22.

---

## 9. Responsive rules (device matrix)

Support **360px (mobile) through 1920px+ (wide desktop)**. Every screen must be verified against
all of these:

| Device | Width | Tailwind bp | Notes |
|---|---|---|---|
| Mobile (small) | 360px | base | smallest supported |
| Mobile (large) | 414px | base | |
| Tablet portrait | 768px | `md` | sidebar becomes a drawer |
| Tablet / small laptop | 1024px | `lg` | |
| Laptop 13" | 1280px | `xl` | sidebar docks |
| Laptop 14" | 1440px | `xl` | |
| Laptop 16" | 1536–1728px | `2xl` | most common dev screen |
| Desktop / wide | 1920px+ | `2xl` | content max-width caps |

### Rules

- **No horizontal PAGE scroll at any width.** Wide content (tables, code, diagrams) scrolls inside
  its own `overflow-x-auto` container — never the page body.
- **No fixed pixel widths for layout** (`w-[320px]`). Use fluid `w-full` + `max-w-*` with grid/flex.
- **Tables**: never rely on a fixed `grid-cols-N` row that can't shrink — wrap in `overflow-x-auto`
  and set a sensible `min-w`.
- **Touch targets ≥40px** on `md` and below. This means the **base** classes (mobile-first, no
  breakpoint prefix) must already satisfy 40px — you cannot rely on a `md:` override to fix it,
  because `md:` only kicks in *at* 768px and anything narrower still gets the un-prefixed base
  size. A component that's only ever rendered inside a `hidden md:flex` / `md:hidden` wrapper is
  **not exempt** — right at the `md` breakpoint (768–1023px) both those wrapper states are live,
  so the button itself still needs to hit 40px there.
- **Icon-only button size scale**: `h-10 w-10` (40px) as the base/mobile size, shrinking to
  `h-8 w-8` (32px) only from `lg` (1024px) up, once mouse precision makes the smaller target safe:
  `className="h-10 w-10 lg:h-8 lg:w-8 ..."`. Text/pill toggle buttons (e.g. a Week/Day switch) use
  the same ladder with padding instead of a fixed width: `h-10 lg:h-7 px-3 lg:px-2`. Applied
  throughout `pages/appointment/` — see `IconBtn` (`Appointment.tsx`), `IconSquareBtn`
  (`AppointmentCalendarView.tsx`), and the Week/Day toggle for the pattern to copy.
- **Icon-only buttons need `aria-label`** (see §4) — a `title` attribute alone is not a reliable
  substitute; pair both (`title={label} aria-label={label}`) so it works for tooltips (mouse) and
  screen readers alike.
- **Custom dropdown/listbox buttons** (anything that isn't HeroUI's `<Select>`) get
  `aria-haspopup="listbox"` + `aria-expanded={isOpen}` on the trigger, and `role="listbox"` on the
  popover with `role="option"` + `aria-selected` on each item — see the status filter
  (`Appointment.tsx`) and rows-per-page control (`components/list/BottomControls.tsx`).
- **Breakpoint ladder**: base (mobile) → `md` 768 (sidebar → drawer) → `lg` 1024 → `xl` 1280
  (sidebar docks) → `2xl` 1536. Confirm the 1024–1279px range isn't left in a drawer-only state.
- **N-card stat row default (this is the standard — don't reintroduce an intermediate grid step)**:
  when a fixed count of stat/KPI tiles doesn't divide evenly by 2, 3, or 4 (5 is the current case
  everywhere), do **not** put a multi-row grid at an intermediate breakpoint (`sm:grid-cols-3`,
  etc.) — any such grid either orphans a lone tile or stacks unevenly (3+2, 4+1) across a wide
  range of real tablet/laptop widths, not just one screenshot's worth. The standard pattern is a
  horizontally-scrollable single-row swipe strip (`flex snap-x snap-mandatory gap-3 overflow-x-auto
  pb-2` + the visible thin-scrollbar utility below) at every width below the breakpoint where all N
  tiles genuinely fit in one row, then switch straight to `grid-cols-N` there (currently `xl`,
  1280px) — see `AppointmentStatCards.tsx` / `PatientStatCards.tsx` / `PaymentStatCards.tsx` for
  the reference implementation, and `UI_REMEDIATION_LOG.md` #1 and #24 for the two rejected
  intermediate-grid attempts.
  **Expected, not a bug:** anywhere below that breakpoint (including the common case of a wide
  window with devtools docked, pushing the content area just under `xl`), the strip will show some
  whole cards plus a **partially cut-off trailing card at the edge** — that's the intended scroll
  affordance ("there's more, swipe/scroll →"), not a layout error. Don't "fix" a partially-visible
  card by adding back an intermediate grid step; that's exactly the thing this pattern replaced.
  **Never use `scrollbar-hide` on this or any other `overflow-x-auto` strip** — it removes the only
  affordance mouse/trackpad (non-touch) users have for discovering there's more to scroll. But don't
  leave a scrollbar permanently visible either — that's clutter under a clean card row at rest. Use
  a scrollbar that's transparent until `hover`/`active`: `[scrollbar-width:thin]
  [scrollbar-color:transparent_transparent] hover:[scrollbar-color:#9ca3af_transparent]
  active:[scrollbar-color:#9ca3af_transparent] [&::-webkit-scrollbar]:h-1.5
  [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full
  [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-gray-400`
  (track height stays fixed so nothing shifts when the thumb fades in). Tables keep an
  always-visible thin scrollbar — a data grid is expected to show scroll chrome; a stat-card row
  isn't. See `UI_REMEDIATION_LOG.md` #28.
- **A collapsible mobile filter panel must wrap from the same breakpoint its children become
  fixed-width, not later.** The standard pattern for a "collapse behind a mobile Filters button"
  panel (see §7's toolbar note) is:
  `className={[mobileFiltersOpen ? "flex" : "hidden", "w-full flex-row flex-wrap items-center gap-3", "lg:flex lg:w-auto"].join(" ")}`
  — **not** `flex-col ... lg:flex-row`. Individual filters are typically sized
  `w-full sm:w-[Npx]` (full width below `sm`, fixed width from `sm` up so several can share a row).
  If the panel itself only allows row-wrapping from `lg`, there's a dead breakpoint range
  (`sm`-`lg`, i.e. 640-1023px) where filters are sized to share a row but the panel forces them
  onto separate ones anyway. `flex-row flex-wrap` at the base breakpoint is safe even for the
  narrowest phones — 100%-width children wrap to their own row regardless of `flex-wrap`, so
  nothing changes below `sm`. See `UI_REMEDIATION_LOG.md` #26.
  **The `lg:flex` in that list is load-bearing, not decorative** — since the panel's base visibility
  is a ternary (`"flex" : "hidden"`) driven by `mobileFiltersOpen` (which defaults to `false`), an
  `lg:` override that only restates `lg:flex-row`/`lg:w-auto` without also restating `lg:flex` will
  silently leave the panel `hidden` on desktop by default. See `UI_REMEDIATION_LOG.md` #29.

---

## 10. Reusable primitives (use these — don't reinvent)

| Need | Use |
|---|---|
| Card container | `components/shared/Card.tsx` |
| Buttons | `AppButton`, `ActionButton` (`components/shared/`) |
| Status pill | `StatusChip` (`components/shared/`) |
| Data table | `components/common/CommonTable` (+ Empty / Error / Loading / Pagination states) |
| Page scaffold | `components/common/PageContainer` + `PageHeader` |
| Form fields | `InputField`, `SelectField`, `DatePickerField`, `DateRangeField` (`components/shared/`) |
| Stat / KPI tile | canonical tile (being consolidated) — avoid the legacy duplicates below |

**Deprecated / duplicate — do not use in new code:** `components/shared/DataTable`,
`components/reports/DataTable`, `components/StatCard`, `components/KpiCards`,
`pages/dashboard/StatCards`, `pages/dashboard/EnhancedStatCard`. Migrate callers to the canonical
primitives when you touch them.

**A list/table page's primary "+ New X" action always goes in `PageHeader`'s `actions` prop**
(top-right, next to the title) — not inside the filter toolbar row. This was inconsistent between
the appointment and patient screens (see `UI_REMEDIATION_LOG.md` #20) before being standardized;
don't reintroduce a toolbar-row create button on a new screen.

---

## 11. Code hygiene

- No dead / commented-out code. Comments in **English**.
- **Comment the "why", not the "what".** Don't add decorative section dividers
  (`// ─── Foo ───────`) or comments that just restate the next line
  (`// Filter state` above `const { ... } = useAppointmentFilters()`). Keep a comment only when it
  explains something non-obvious — a workaround, a layout trick (`lg:contents`), an ordering
  guarantee, a perf reason. Delete the rest; good names carry the intent.
- Avoid `any`; import types from `src/types/<domain>/`.
- Keep pages built from the shared scaffold + primitives above, not bespoke one-offs.
- Run `npm run lint` and `npm run build` before pushing.

---

_See also: `docs/playbook/UI_PLAYBOOK.md` (fast-start checklist summarizing the recurring bugs/patterns below
— start there for a new screen), `CLAUDE.md` (architecture & state management),
`docs/playbook/UI_REMEDIATION_LOG.md` (per-screen fixes written as reusable patterns — read before
fixing a screen), `docs/UI_AUDIT.md` (tracked list of current UI/responsive/structure issues), and
`docs/ONBOARDING_GUARD_IMPLEMENTATION.md`._
