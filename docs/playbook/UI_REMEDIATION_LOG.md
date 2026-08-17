# UI Remediation Log

A running record of UI consistency/responsive fixes, written as **reusable patterns**.
When you fix a screen, add an entry here so the same issue can be fixed the same way elsewhere.
See [UI_CONVENTIONS.md](./UI_CONVENTIONS.md) for the standing rules.

Format per entry: **Symptom → Root cause → Fix → Reusable rule**.

---

## Appointments page (`src/pages/appointment/`)

### 1. Stat cards orphaned a lone card at desktop widths
- **Symptom:** 5 stat cards rendered 2 + 2 + 1, stranding "No Show" alone (~1100px).
- **Root cause:** used the shared `.stats-scroll` class, which forces a fixed **2-column grid from 640–1280px**.
- **Fix:** replaced with an explicit responsive grid on the container:
  `grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5` (`Appointment.tsx`).
- **Reusable rule:** for a **fixed count of stat/KPI tiles**, use an explicit column ladder that
  lands the exact count on one row at the top breakpoint (5 tiles → `lg:grid-cols-5`). Don't rely on
  `.stats-scroll` for non-2/4 counts. Never leave a single orphaned tile on wide screens.

### 2. Hardcoded colors + redundant dark overrides
- **Symptom:** `bg-white` / `border-slate-200` with a paired `dark:bg-[#111726]` / `dark:border-[#273244]`.
- **Root cause:** the `.dark` block in `index.css` already **remaps the CSS variables**, so the base
  class auto-switches in dark mode — the `dark:` hex is redundant.
- **Fix:** `bg-white` → `bg-surface`, `border-slate-200/gray-200` → `border-line`, and **delete** the
  redundant `dark:` hex. Renders identically in both themes.
- **Reusable rule:** prefer semantic tokens (`bg-surface`, `bg-surface-muted`, `text-text`,
  `text-text-muted`, `border-line`); drop any `dark:bg-[#...]`/`dark:border-[#...]` sitting next to a
  base class that already remaps. Never add new raw `dark:` hex.

### 3. Inline/duplicated types in components
- **Symptom:** `AppointmentListView.tsx` declared its own `Row` type (a duplicate of the mapper's
  `AppointmentRow`) plus `Props`, `PageSize`, `Layout`, `QueueWaitData` inline.
- **Fix:** reuse the canonical `AppointmentRow` from `utils/appointment.mapper.ts`; move the rest into
  a domain module `src/types/appointment/` (`list.ts` + barrel `index.ts`); import from there.
- **Reusable rule:** when touching a file with inline domain/prop types, **reuse an existing shared
  type** if one exists (don't duplicate), otherwise lift them to `src/types/<domain>/` with a barrel.
  Component prop interfaces move too (`<Component>Props`).

### 4. Table not reachable on mobile
- **Symptom:** on phones the appointment **table never showed** — only cards, with no way to switch.
- **Root cause:** two things combined — (a) `useAppointmentFilters` had a resize effect that
  **force-overwrote** `view` to `card`/`list` on mount and every breakpoint change, clobbering manual
  choice; (b) the view toggle was `hidden sm:flex`, so mobile users couldn't switch views at all.
- **Fix:** (a) the resize effect now only sets a **default** and bails once the user explicitly picks a
  view (`userChoseViewRef`); (b) the toggle is visible on all widths (`flex`, not `hidden sm:flex`).
  The list view's table is already `overflow-x-auto` + `min-w`, so it scrolls on mobile.
- **Reusable rule:** breakpoint auto-switching may set a **default** but must **never override an
  explicit user choice**. Don't hide primary view/layout controls on mobile. Wide tables must live in
  an `overflow-x-auto` container with a `min-w` so they scroll rather than break the page.

### 5. Stat cards took too much vertical space on mobile
- **Symptom:** 5 full-height stat cards stacked on mobile pushed the actual appointment list far
  below the fold.
- **Fix:** on mobile the stat row is a **compact horizontal swipe strip** (one row, ~1 card tall,
  `flex overflow-x-auto snap-x scrollbar-hide`, each card `w-[180px] shrink-0 snap-start`); from `sm`
  up it becomes the normal grid (`sm:grid sm:grid-cols-3 lg:grid-cols-5`, cards `sm:w-auto`).
- **Reusable rule:** when a KPI/stat row has many tiles, don't stack them full-height on phones —
  make the row a swipe strip below `sm` and a grid above. Reuse `.scrollbar-hide` (already in
  `index.css`) and `snap-x snap-mandatory` for a native-feeling swipe.

### 6. Stat-card labels truncated ("Total Appoi…") — icon stole the width
- **Symptom:** in the narrow mobile card the 48px icon sat in a `flex` row *beside* the text, leaving
  ~80px for content, so labels/detail truncated to "Total Appoi…" / "0% Previous P…".
- **Fix:** made the card layout **breakpoint-specific** rather than one-size-fits-all. Mobile
  (`sm:hidden`): label spans full width, icon is a small top-right accent, labels wrap (no truncate).
  Desktop (`hidden sm:flex`): the original icon-left row is kept as-is (it looked good there), just
  tokenised (`text-text` / `text-text-muted`).
- **Reusable rule:** a compact treatment that helps a narrow card can look wrong on a wide one. When
  a redesign only benefits one size, scope it with `sm:hidden` / `hidden sm:flex` (two small blocks)
  instead of forcing a single layout everywhere. In the *narrow* variant, give text full width and
  make the icon a small top-corner accent; avoid `truncate` so labels wrap.

### 7. Filter toolbar ate too much vertical space on mobile
- **Symptom:** search + date-range + status + view-toggles/button stacked as ~4 full-height rows
  before the list on phones.
- **Fix:** on mobile the date-range + status collapse behind a **"Filters" button** (`FiSliders`,
  `lg:hidden`) that toggles `mobileFiltersOpen`; only Search + Filters + the toggles/New-Appointment
  row stay visible. Desktop is untouched — the search wrapper uses `lg:contents` and the collapsible
  panel uses `lg:flex lg:flex-row`, so from `lg` up everything renders inline exactly as before.
- **Reusable rule:** on mobile, keep only the primary control (search) + primary action visible and
  **collapse secondary filters behind a Filters toggle**. Scope it with `lg:hidden` + `lg:contents` /
  `lg:flex` so the desktop inline layout is completely unchanged — no duplicate markup, one source.

### 8. Comment noise (decorative dividers / restating code)
- **Symptom:** the page was littered with `// ── Section ──────` dividers and comments that just
  restated the next line (`// Filter state` above the `useAppointmentFilters()` call).
- **Fix:** removed all decorative/restating comments; kept only the ones explaining a real "why"
  (backend ordering guarantee, the `lg:contents` layout trick, the memo-avoids-new-Map reason).
- **Reusable rule:** comment the **why, not the what**. No ASCII/box-drawing section dividers, no
  comments that a good variable/function name already conveys. See "Code hygiene" in
  `UI_CONVENTIONS.md`.

---

### 9. Calendar/grid views had zero dark-mode support
- **Symptom:** `AppointmentCalendarView.tsx` (the calendar view) hardcoded `bg-white`,
  `border-slate-200`, `text-slate-*` everywhere with **no `dark:` classes at all** — the calendar
  grid, headers, tooltips, and view-toggle buttons stayed light-themed even with dark mode on. The
  card ("grid") layout in `AppointmentListView.tsx` had already adopted `bg-surface`/`border-line`
  for its outer containers but many inner elements still paired raw `bg-slate-50`/`text-slate-900`
  with a redundant `dark:bg-[#0f1728]` / `dark:text-white`.
- **Root cause:** these two views were never touched in the initial tokenisation pass on the list
  view — the semantic tokens already remap `--color-slate-*` in `.dark` (see rule #2), so hardcoded
  `slate-*` classes work fine in light mode but silently do nothing in dark mode.
- **Fix:** swapped `bg-white` → `bg-surface`, `border-slate-200` → `border-line`,
  `text-slate-900/700` → `text-text`, `text-slate-600/500` → `text-text-muted`,
  `text-slate-400/300` → `text-text-subtle`, `bg-slate-50` → `bg-surface-muted`; the "today"
  highlight `bg-blue-50`/`text-blue-600` became `bg-primary/5|10`/`text-primary`, and the
  week/day toggle's active state `bg-slate-900` became `bg-primary`. Deleted every redundant
  `dark:bg-[#...]`/`dark:text-white` pair in the card view now that the base class remaps. Also
  removed a dead commented-out "This week / Today" button block in the calendar header.
- **Reusable rule:** when touching an older screen, grep it for `bg-white`, `border-slate-200`,
  and `text-slate-` — a screen with **zero** `dark:` classes usually means it predates
  tokenisation entirely, not that it's already fine. Prefer `bg-primary`/`text-primary` over
  `bg-blue-*`/`text-blue-*` for "active/today/selected" affordances so it matches the brand rather
  than an arbitrary blue.

### 10. Dead no-show modal state in the grid/card view
- **Symptom:** `AppointmentListView.tsx` declared `noShowModalOpen`/`noShowAppointmentId` state and
  rendered `<MarkNoShowModal>` in both the list and card layouts, plus a kebab "Action" button on
  each grid card — but the setter that opens the modal (`setNoShowModalOpen(true)`) was never
  called anywhere, and the id setter was already prefixed `_setNoShowAppointmentId` to silence the
  unused-var lint rule. The kebab button just called `goToDetails`, identical to clicking the card.
- **Root cause:** leftover scaffolding from before the mark-no-show flow moved to the appointment
  details page (`AppointmentDetailsModals.tsx`, which wires `MarkNoShowModal` correctly).
- **Fix:** removed the dead state, both `<MarkNoShowModal>` renders, the redundant kebab button
  (the card is already a `role="button"` with its own click/keyboard handler), and the now-unused
  `FiMoreVertical` import.
- **Reusable rule:** a setter prefixed with `_` to dodge the unused-var linter is a signal the
  whole feature branch around it may be dead, not just that one variable — trace whether the
  "open" action is ever actually called before assuming the state is just unused-but-harmless.

### 11. View-toggle icons broken/invisible in dark mode + missing accessible names
- **Symptom:** in dark mode, the Calendar view-toggle icon rendered as a near-invisible dark blob
  (see screenshot in this session) while the List/Grid icons next to it looked fine.
- **Root cause:** List/Grid used `react-icons` (`FiList`, `FiGrid`) which render as inline SVG with
  `fill="currentColor"`, so they inherit the button's `text-*` class and repaint correctly per
  theme. The Calendar icon was a **raster PNG** (`<img src={bxCalendar} .../>`) — a fixed-color
  bitmap that cannot inherit `currentColor` at all, so it stayed at its own baked-in dark artwork
  color regardless of theme, active state, or hover.
- **Fix:** replaced the PNG with `FiCalendar` from the same `react-icons/fi` set already used for
  the other two toggle buttons — now all three repaint identically via `currentColor`.
- **Also found while reviewing this button group (`IconBtn` in `Appointment.tsx`):**
  - None of the three view-toggle buttons had an `aria-label` — icon-only buttons with no
    accessible name are invisible to screen readers. Added `label` prop → `aria-label` +
    `aria-pressed` + `title` on `IconBtn`.
  - `IconBtn`'s own inactive-state classes had the same redundant `dark:text-white
    dark:hover:bg-[#151e31]` pattern as the rest of the page (already remapped via `text-slate-600`
    → tokenised to `text-text-muted hover:bg-surface-muted`).
- **Reusable rule:** an icon that doesn't visually match its siblings in one theme is almost always
  a **raster image / hardcoded-fill SVG** sitting next to `currentColor` icon-font components —
  check `grep -n '<img\|fill="#'` around icon buttons before assuming it's just a missing token.
  Icon-only buttons always need `aria-label` (see UI_CONVENTIONS.md §4) — it's easy to miss because
  the button still "looks" fine to a sighted reviewer.

### 12. More redundant/broken dark: overrides found in the toolbar (Appointment.tsx)
While reviewing the icon buttons, swept the rest of the toolbar (search field, date-nav
chevrons, status filter dropdown, queue-dismiss "✕") and found the same two problems repeated:
- **Redundant `dark:` hex pairs** next to base classes that already auto-remap
  (`border-slate-200`→`border-line`, `bg-white`→`bg-surface`, `dark:bg-[#111726]`→already what
  `bg-surface` resolves to in dark, `dark:border-[#273244]`→already what `border-line` resolves to)
  — deleted all of them across the search field, both date-nav chevron buttons, and the status
  dropdown + its popover list.
- **An actively wrong dark override, not just redundant:** the queue-dismiss "✕" button used
  `hover:text-slate-600 dark:hover:text-slate-300` — but `--color-slate-300` in `.dark` is
  `#38445a` (a **dark** blue-gray), so hovering the button in dark mode made the icon *less*
  visible against the dark page background instead of more. Replaced with
  `text-text-subtle hover:text-text-muted`, which resolves to a legible light gray in dark mode.
  The status-list active-item highlight (`bg-teal-50`/`dark:bg-[#173c36]`) was also swapped for
  `bg-primary/10 text-primary` to match the active-state convention already used by `IconBtn` and
  the mobile Filters toggle in the same file, instead of a one-off teal.
- **Reusable rule:** don't assume a `dark:` override is safe just because it exists — a manual
  `dark:hover:text-slate-300`-style override can point at a color that was never actually checked
  against the `.dark` remap of that same shade, producing a hover state that's *worse* than no
  override at all. When you see `dark:text-slate-N` (not `dark:text-white`), open `index.css` and
  confirm what that slate step actually resolves to under `.dark` before trusting it.
- **Not fixed — flagging for a product decision:** the "Press A for New Appointment" hint bubble
  next to the New Appointment button (`Appointment.tsx`, the `showNewAppointmentHint` block) has an
  inner `<div className="hidden whitespace-nowrap ...">` — that literal `hidden` (no responsive
  prefix) means the bubble can **never render** regardless of the parent's `lg:block`. This looks
  like an accidental leftover rather than an intentionally disabled feature; left as-is since
  removing `hidden` changes visible behavior, which needs a product call, not a styling fix.

### 13. Booking Source badge unreadable in dark mode — the "inverted slate" trap
- **Symptom:** on the appointment table (list view), the "Walk-In" Booking Source badge was a
  near-invisible grey box with barely-legible grey text in dark mode (screenshot in this session).
  The other three booking-source variants (Phone Call/Web Portal/Mobile App) looked fine.
- **Root cause:** `getBookingSourceMeta`'s `walk_in` and `default` cases used
  `bg-slate-50 ... dark:bg-slate-900/40 dark:text-slate-400 ... dark:border-slate-800/30`. This
  app's `.dark` block **inverts the entire `slate` scale** (`slate-900` → near-white, `slate-800` →
  near-white) so plain `text-slate-900` auto-flips to readable white text with no `dark:` prefix
  needed. But `dark:bg-slate-900/40` explicitly asks for slate-900's *dark-mode* value (near-white)
  at 40% opacity over an already-dark page — composited, that's a medium-gray box — and
  `dark:text-slate-400` (`#64748b`) sits at almost the same luminance as that box. Low contrast,
  reads as invisible. The other three variants used `sky`/`indigo`/`purple`, none of which are
  redefined in `.dark`, so their `dark:*-950/40` overrides behaved as normal Tailwind dark-mode
  conventions and were fine.
- **Fix:** replaced the slate-based neutral variant with semantic tokens:
  `bg-surface-muted text-text border border-line` (no manual `dark:` needed — the tokens already
  carry correct dark values). Swept the same file for the identical pattern and fixed:
  - `PaymentCell`'s "Free consultation" / "Not Required" chip (`bg-slate-100 dark:bg-slate-800
    dark:text-slate-300`) and its generic payment-status-text fallback (`text-slate-500
    dark:text-white`) → tokens.
  - `getPaymentModeMeta`'s default icon background (`bg-slate-100 ... dark:bg-[#172033]
    dark:text-white`) → `bg-surface-muted text-text-muted`.
  - `QueueStatusIcon`'s `cancelled` variant (`bg-slate-50 dark:bg-slate-800/40
    dark:text-slate-500`, hover `dark:hover:bg-slate-700/40`) → tokens — same washed-out-box bug,
    shown in the "Est. Wait" column for cancelled/no-show rows.
  - The entire `<table>` markup in the list layout (thead, row hovers, avatars, cell text) still
    had the mechanical `dark:text-white` / `dark:bg-[#111726]` redundant-hex pattern from before
    this feature's tokenisation pass reached it — swept to tokens in the same pass as #1–#12.
- **Reusable rule:** added a permanent warning to `UI_CONVENTIONS.md` §2 — **never use a manual
  `dark:slate-N` override**; either let the bare `slate-N` class auto-flip, or use the semantic
  tokens. This is the single most likely cause of "looks fine in light mode, unreadable in dark
  mode" bugs in this codebase, and it silently passes code review because the light-mode render is
  correct and the class names *look* like they should also be correct in dark mode.

### 14. Split `AppointmentListView.tsx` into `components/list/`
`AppointmentListView.tsx` was one ~950-line file holding the table layout, the card layout, and
five inline helper components (`PaymentCell`, `BookingSourceCell`, `BottomControls`,
`DraftDataIndicator`, `Skel`), plus several formatter functions. Split per the new folder-structure
rule in `UI_CONVENTIONS.md` §1 ("worked example"):
- `AppointmentListView.tsx` is now a thin dispatcher — owns the shared prescription-draft-indicator
  state/effect, renders `<AppointmentTable>` or `<AppointmentCardGrid>` from `components/list/`.
- Non-JSX formatter/lookup functions (`doctorDisplayName`, `toTimeRange`, `getPaymentModeMeta`,
  `getBookingSourceMeta`, `isTerminalAppointmentStatus`) moved to
  `helpers/appointmentListFormatters.ts`.
- New shared prop types (`AppointmentListSharedProps`, `AppointmentTableProps`,
  `AppointmentCardGridProps`, `BottomControlsProps`, `BookingSourceMeta`, `PaymentModeMeta`) added
  to the existing `src/types/appointment/list.ts` barrel rather than declared inline in components.
- No behavior change — verified via `tsc -b` + `eslint` after the split, and confirmed no other
  file imported the old file's internal (non-exported) pieces directly.

### 15. Icon buttons under 40px touch target + missing dropdown ARIA (calendar + toolbar)
- **Symptom:** several icon/toggle buttons in the calendar view and toolbar were smaller than the
  documented 40px minimum, and a couple of custom dropdowns didn't expose their open/closed or
  selected state to assistive tech.
- **Found:**
  - `AppointmentCalendarView.tsx`'s `IconSquareBtn` (prev/next/fullscreen) was a fixed `h-8 w-8`
    (32px) used in **both** the `hidden md:flex` desktop header and the `md:hidden` mobile header —
    meaning the mobile instance was always under the minimum, and the desktop instance was already
    live (and still under 32px) right at the `md` breakpoint (768–1023px) where the rule still
    requires 40px.
  - The Week/Day toggle pills were `h-7` (28px), same breakpoint problem.
  - The queue-status "✕" dismiss button (`Appointment.tsx`) was a fixed `h-6 w-6` (24px) with no
    responsive sizing at all.
  - `BottomControls`' rows-per-page trigger/options were `h-9` (36px), just under the minimum.
  - `IconSquareBtn` only had a `title` attribute, no `aria-label` (title alone isn't a reliable
    accessible name across all screen readers/touch devices).
  - The rows-per-page dropdown and the status-filter dropdown (both hand-rolled, not HeroUI
    `<Select>`) had no `aria-haspopup`/`role="listbox"`/`role="option"`/`aria-selected` — a screen
    reader couldn't tell they were dropdowns or which option was selected.
- **Fix:** adopted a two-tier size scale — `h-10 w-10` (40px) base/mobile, `lg:h-8 lg:w-8` (32px)
  once mouse precision is safe (or `h-10 lg:h-7 px-3 lg:px-2` for text/pill toggles) — applied to
  `IconSquareBtn`, the Week/Day toggle, and the queue-dismiss button. Added `aria-label` alongside
  `title` on `IconSquareBtn`, `aria-pressed` on the Week/Day toggle buttons, and the
  `aria-haspopup`/`role="listbox"`/`role="option"`/`aria-selected` set on both custom dropdowns.
- **Reusable rule:** documented as a permanent size scale in `UI_CONVENTIONS.md` §9 — new icon
  buttons should copy `IconBtn`/`IconSquareBtn` rather than picking an ad-hoc height. When a
  component only renders inside a breakpoint-gated wrapper (`hidden md:flex` / `md:hidden`), that
  does **not** exempt it from the base-size touch-target rule — check what's actually live at the
  `md` boundary itself, not just "mobile" vs "desktop" as two disconnected cases.

### 16. Whole-page re-render every 60s from a clock tick only the calendar needed
- **Symptom:** none reported by a user, found while reviewing `Appointment.tsx` for optimization
  opportunities — the entire page (toolbar, stat cards, and the full list/card row map) re-rendered
  every 60 seconds, even while viewing List or Card (where the calendar isn't even mounted).
- **Root cause:** `useAppointmentRealtimeSync()` held a `useState<Date>` clock tick (`setInterval`,
  60s) and returned `now`, which `Appointment.tsx` then passed into `useAppointmentCalendar(now)`
  to compute the calendar's current-time-line. Both hooks were called directly inside `Appointment`,
  so their internal state belongs to `Appointment`'s own fiber — **a hook's `useState` always
  re-renders whichever component function is executing when the hook runs**, no matter how many
  layers of custom hooks it's nested inside. There's no way to scope a hook's re-render to "just
  part of the JSX it returns"; only an actual child component (its own fiber) can isolate that.
- **Fix:** moved the clock tick + `currentTimeLine` computation out of the shared hooks and into
  `AppointmentCalendarView` itself (the only consumer). `useAppointmentRealtimeSync` now only
  keeps the socket subscription (returns `void`); `useAppointmentCalendar` dropped its `now` /
  `dynamicHours` params and no longer returns `currentTimeLine`. Now the 60s tick's re-render is
  scoped to the calendar subtree, and List/Card view pay zero cost from it since
  `AppointmentCalendarView` isn't even mounted there.
- **Bonus correctness fix:** the old code called `useAppointmentCalendar(now)` with only one
  argument, so `dynamicHours` silently used its hardcoded default (`{ minHour: 8, maxHour: 20 }`)
  instead of the real per-clinic dynamic hours already available as `hours`/`minHour` props on
  `AppointmentCalendarView`. The relocated computation now derives `maxHour` from those real props
  (`minHour + hours.length`), so the time-line's visible window actually matches the clinic's grid.
- **Reusable rule:** if a periodic/frequently-changing piece of state (clock ticks, polling,
  scroll position) is only consumed by one child component or subtree, **put the `useState` +
  effect inside that child**, not in a parent hook that gets called from a higher component. Lifting
  such state up "to share the hook" silently makes the *entire* parent subtree pay the re-render
  cost of state most of it doesn't use.

### 17. Split `Appointment.tsx`'s inline toolbar into `components/toolbar/`
Continuing the pattern from #14, `Appointment.tsx` (756 lines) had the stat-cards row, the
real-time queue status bar, and the ~190-line filter/view toolbar (search, mobile-filters toggle,
date-nav, status dropdown, view toggle, New Appointment button) all written inline, including two
unexported helper components (`IconBtn`, `StatCard`). Split into `components/toolbar/` (see
`UI_CONVENTIONS.md` §1) — `AppointmentToolbar`, `AppointmentStatCards`, `QueueStatusBar`,
`StatusFilterDropdown`, `ViewToggle`, `StatCard`, `IconBtn` — with new prop types added to
`src/types/appointment/toolbar.ts`. `Appointment.tsx` went from 756 → 441 lines and is now purely
state/queries + composition; no behavior change (verified via `tsc -b` + `eslint`, and confirmed no
other file imports the old inline helpers directly since they were never exported).

### 18. Mobile stat-card strip took too much vertical space per card
- **Symptom:** on mobile the stat-card swipe strip's individual cards (`StatCard.tsx`) ran ~140px
  tall — a stacked layout (label row, then a large 22px value, then a detail line) with generous
  `p-4` padding on all sides — pushing the actual appointment list well below the fold.
- **Fix:** gave the mobile-only block (`sm:hidden`) a genuinely different, compact layout instead
  of just shrinking the same stacked one: icon + value/label go **inline** in a single row
  (`flex items-center gap-2.5`), value drops to 16px, detail sits next to the value instead of on
  its own line, and the card's own padding drops to `p-2.5` (vs `p-4` from `sm` up). Card width
  also narrowed `180px → 148px`. The `sm:flex` desktop block was untouched.
- **Reusable rule:** when a "make mobile more compact" request comes in for a card/tile component
  that already has a `sm:hidden` / `hidden sm:flex` split (see #6 for how that split was
  introduced), don't just shrink font sizes within the existing stacked structure — that rarely
  gets you enough height back. Change the **layout direction** for the mobile variant (stacked →
  inline row) so the value and label share a row instead of each getting their own.

### 19. Patients page — the entire appointment-screen playbook reproduced verbatim
- **Symptom:** `pages/patient/Patient.tsx` (774 lines, single file) turned out to have almost every
  bug already catalogued in this log, independently reproduced: the `.stats-scroll` 5-card orphan
  bug (#1, identical 5-stat-card count), redundant `dark:` hex pairs across the stat cards, toolbar
  filters (search/gender/status/age inputs), table (thead/rows/avatars), and an inline
  `BottomControls` that was near byte-for-byte identical to the appointment screen's *pre-fix*
  version (`border-slate-100 dark:border-[#273244]`, `text-slate-500 dark:text-white`, etc.).
- **New findings not yet in this log:**
  - The sort trigger was a `<th onClick={...}>` — a table header cell with a click handler but no
    `role="button"`, `tabIndex`, or keyboard handler, so it was **not reachable or activatable by
    keyboard at all**. Fixed by moving the click handler onto a real `<button>` inside the `<th>`,
    with `aria-sort` on the `<th>` itself and an `aria-label` stating the current sort direction.
    This same gap exists on the appointment table's status-sort `<th>` — not fixed there yet since
    it wasn't caught during that pass; worth a follow-up.
  - The Min/Max Age `<input type="number">` fields had only a `placeholder`, no `aria-label` —
    placeholder text is not an accessible label substitute (it disappears once the field has a
    value, and many screen readers don't reliably announce it as a label). Added
    `aria-label="Minimum age"` / `"Maximum age"`.
- **Fix:** applied the exact same treatment as the appointment screen — tokens throughout, the
  explicit stat-card grid ladder (`sm:grid-cols-3 xl:grid-cols-5`, not `.stats-scroll`), the compact
  mobile stat-card pill from #18, 40px/32px button sizing, and split into
  `pages/patient/components/{list,toolbar}/` + `pages/patient/helpers/patientFormatters.ts` +
  `src/types/patient/{list,toolbar}.ts`, mirroring the appointment folder structure exactly.
- **On the shared-component question:** this is now the **second real, near-identical consumer**
  of the appointment screen's `BottomControls` pattern — per the "wait for a second consumer"
  guidance (see the playbook), this is the trigger point to promote it. It was **not** promoted in
  this pass: `components/common/CommonTablePagination.tsx` already exists as a designated shared
  pagination primitive, but uses a different visual pattern (native `<select>` vs. the custom
  dropdown button+popover used here) and currently has **zero dark-mode support** (not even the
  redundant-pair kind — no dark handling at all). Reconciling three pagination implementations
  (appointment's, patient's, and `CommonTablePagination`) into one is a deliberately separate,
  higher-blast-radius task — flagged here rather than done silently mid-screen-fix.
- **Reusable rule:** when starting a new screen, grep it for the exact bug signatures already in
  this log *before* reading the file top to bottom — `.stats-scroll` with a 5-item map, `<th
  onClick`, `placeholder=` on a filter input with no sibling `aria-label`, and the usual
  `dark:.*slate-[0-9]` / `dark:bg-\[#` sweep. A screen that "looks similar" to one already fixed is
  very likely to share its bugs exactly, not just its layout.

### 20. Primary CTA position inconsistent across screens — appointments vs. patients
- **Symptom:** the appointment screen's "+ New Appointment" button lived inside the filter
  toolbar row (right side, next to the view toggles); the patient screen's "+ New Patient" button
  lived in the page header, next to the title. Two screens meant to feel like one product had the
  primary create-action in two different places.
- **Root cause:** `Appointment.tsx` never adopted the shared `components/common/PageHeader`
  primitive (already documented in `UI_CONVENTIONS.md` §10 as the canonical page scaffold) — it
  hand-rolled its own `<h2>`/`<p>` header markup instead. `Patient.tsx` already used `PageHeader`
  correctly. This wasn't "two valid choices," it was one screen following the documented
  convention and one that had drifted from it before the convention doc existed.
- **Fix:** standardized on `PageHeader.actions` (top-right, next to the title) for the primary
  create button — decided by the user; see `UI_CONVENTIONS.md` §10 and this entry for the
  rationale. Migrated `Appointment.tsx` off its hand-rolled header onto `PageHeader`, extracted the
  button + its "Press A" hint bubble into `components/toolbar/NewAppointmentButton.tsx`, and
  trimmed `AppointmentToolbar`'s right side down to just the view toggle. Also fixed
  `PageHeader.tsx` itself — it had the same redundant-`dark:`-hex pattern
  (`text-slate-950 dark:text-white`, `dark:text-white text-slate-500`) as everything else in this
  log; tokenizing it fixes the header on **every** page that uses `PageHeader` (10 consumers,
  mostly `pages/dashboard/superadmin/*`), not just these two.
- **Also fixed while comparing the two screens** — the patient filter toolbar didn't collapse
  gender/status/date/age behind a mobile "Filters" button the way the appointment toolbar does
  (#7); on narrow screens every filter field stacked full-height instead of staying compact. Added
  the same `mobileFiltersOpen` collapse pattern to `PatientFiltersToolbar`.
- **Reusable rule:** when two screens that are "supposed to look the same" actually differ, don't
  assume the difference is a deliberate design choice worth preserving — check which one is
  actually following the documented convention (folder structure, shared primitives) and fix the
  other to match, rather than picking whichever one happens to be in front of you. A shared
  primitive (`PageHeader`, `StatusChip`, `CommonTable`, …) that only some pages use is a strong
  signal: fixing the primitive itself fixes every page that already opted in, for free.

### 21. PageHeader's action button ate a whole extra row on mobile
- **Symptom:** after #20 moved the primary CTA into `PageHeader.actions`, screenshots on a real
  narrow viewport showed the button dropping onto its **own full-width row** below the
  title/description, on both the appointment and patient screens — undoing some of the vertical
  space work from #6/#18. This wasn't new breakage from #20; `PageHeader`'s old layout
  (`flex flex-col ... lg:flex-row`) already stacked title and actions until `lg` (1024px), so
  Patients had this exact issue before #20 too — #20 just made it visible on a second screen.
- **Fix:** restructured `PageHeader` so the title and `actions` slot **always share one row**,
  even at the base/mobile breakpoint (`h2` gets `truncate` + `min-w-0`, actions gets `shrink-0`);
  `description` moved to its own full-width line below. This only solves half the problem — a
  full-text "+ New Appointment" button next to a title still doesn't fit on a 360px screen. The
  other half: the two buttons themselves (`NewAppointmentButton.tsx`, `NewPatientButton.tsx`) now
  render **icon-only below `sm`** (a bare `FiPlus`, `aria-label` carries the accessible name) and
  the full "+ New X" label from `sm` up, so the row never wraps regardless of title length.
- **Reusable rule:** a shared header's "actions" slot should never be assumed to have unlimited
  width — if you put a text-label button there, either (a) make the *button itself* responsive
  (icon-only under `sm`, as done here), or (b) explicitly design for it to stack, but consciously,
  not as an accidental side effect of a `flex-col` default. Don't just verify a new layout in a
  wide viewport and assume the wrapping child components are automatically fine.

### 22. Light/dark theme toggle flashed instead of transitioning
- **Symptom:** switching theme (the "Dark mode" toggle in the header) instantly snapped every
  background/text/border color to its new value app-wide — no transition, just a flash — across
  every screen, not specific to appointments or patients.
- **Root cause:** `useTheme.ts` toggles the `.dark` class on `<html>`, which flips every
  `--color-*` custom property's value. Nothing in `index.css` declared a `transition-property` on
  `background-color`/`color`/`border-color` etc., so the browser had nothing to interpolate and
  just repainted instantly.
- **First pass (incomplete):** added a `@layer base` rule giving every element a 200ms transition
  on `background-color, border-color, color, fill, stroke, box-shadow`. **Deliberately scoped to
  `@layer base`, not left unlayered** — Tailwind v4 (`@import "tailwindcss"`) uses CSS cascade
  layers, and per spec an unlayered rule beats *every* layered rule regardless of specificity or
  source order. A bare `*{ transition-property: ... }` outside any `@layer` would have silently
  overridden every component's own `transition-transform`/`duration-*` Tailwind utility (hover
  scales, icon rotations, etc.) app-wide — `@layer base` keeps it as the fallback default that any
  utility class still wins over.
- **User feedback after the first pass:** screenshots mid-toggle showed sidebar/page text sitting
  in a washed-out, hard-to-read state that lingered long enough to screenshot — "not smooth."
- **Real fix:** animating `color`/`fill`/`stroke` was the problem, not a duration/layering bug.
  Any crossfade between two text colors necessarily passes through a low-contrast blended
  midpoint — that reads as "washed out," not smooth, no matter the duration. Removed `color`,
  `fill`, `stroke` from the transition-property entirely; only `background-color`, `border-color`,
  `box-shadow` fade now. Text and icon color snap instantly on theme change (imperceptible,
  because it's a single-frame change, not a multi-frame blend through low contrast), while
  surfaces/borders still crossfade smoothly. This is the same pattern most polished dark-mode
  toggles use, for the same reason.
- **Reusable rule:** any new raw CSS added to `index.css` (not a Tailwind utility class) needs to
  go in the matching `@layer` block — unlayered wins over everything in this codebase's cascade-layers
  setup, the opposite of normal CSS specificity intuition. Separately: **don't animate text/icon
  color through a theme crossfade** — it's not a bug that needs a duration tweak, it's inherent to
  animating that property at all; only animate surface/border/shadow properties for a "smooth"
  theme toggle, and let foreground color change instantly.

### 23. `bg-white` is a *third*, different dark-mode trap — never inverts, unlike everything else
- **Symptom:** the app's real sidebar `<aside>`, its loading-skeleton variant, `MainLayout`'s
  shell-level `SidebarSkeleton`/`HeaderSkeleton`, a sidebar popover, and a sidebar toggle button
  all rendered pure white in dark mode — not washed-out-but-present like the slate-inversion bug
  (#1–#13), just **permanently, unconditionally white**, with no `dark:` override at all.
- **Root cause:** this is a *third* color trap, distinct from both previously-documented ones.
  `index.css`'s `.dark` block explicitly does **`--color-white: #ffffff;`** with the comment "Keep
  white as real white so text-white and dark:text-white remain readable." This is intentional and
  correct for its purpose (so `dark:text-white` reliably means "force white text"), but it means
  **`bg-white` with no `dark:` pairing is not like `bg-slate-50` — it will never, ever invert**,
  in any theme, anywhere in this codebase. A screen that "looks mostly fine" in dark mode can still
  have literal `bg-white` containers sitting undetected, because nothing about them looks like the
  washed-out slate bug — they're just solid, confidently white, in the wrong theme.
- **Where found**: `components/shared/Sidebar.tsx` (real `<aside>`, loading-state `<aside>`, a
  `PopoverContent`, the collapse-toggle button, an active-tab pill) and `Layouts/MainLayout.tsx`
  (`SidebarSkeleton`, `HeaderSkeleton`) — all fixed to `bg-surface`/`border-line`. These are
  shell-level components that wrap *every* page, so the bug was invisible on individual screens
  that had already been tokenized (their own content looked fine) while the chrome around them
  didn't.
- **Reusable rule / checklist addition:** `grep -n 'bg-white\b' <file>` (word-boundary, to exclude
  `bg-white/70` opacity variants which are a separate call) and check each hit for a `dark:` pair.
  If there isn't one, it's not "probably fine like slate" — it is **guaranteed wrong**. Prioritize
  checking shell/layout components (`Layouts/`, `Sidebar`, `Header`, any `*Skeleton` component) over
  individual pages, since a shell-level miss silently affects every screen that renders inside it,
  and a page that "looks fixed already" doesn't rule out its surrounding chrome being broken.

### 24. The "fixed" 5-card stat grid was still awkward across a wide mid-range
- **Symptom:** after #1 replaced `.stats-scroll` with `sm:grid-cols-3 xl:grid-cols-5`, testing at a
  narrowed viewport (roughly 640–1279px — tablets, small laptops, or devtools with a docked panel)
  showed the 5 stat cards stacking as an uneven 3-then-2 row on **both** the appointment and
  patient screens. This wasn't a bug specific to either screen — both `AppointmentStatCards.tsx`
  and `PatientStatCards.tsx` were verified byte-identical, so it was the shared design itself.
- **Root cause:** 5 doesn't divide evenly by 2, 3, or 4. Any intermediate grid step picked to avoid
  a *single* orphaned tile (the original #1 bug) still produces an *uneven* stacked row instead —
  there is no column count between 1 and 5 that lays out 5 items evenly, so "fixing" the orphan
  with `grid-cols-3` just traded one imperfect layout for a different imperfect layout, and left it
  visible across a much wider range (roughly 640px of viewport width) than the original bug.
- **Fix:** stopped trying to grid 5 items into a multi-row layout at all below the point where they
  actually fit in one row. Now: a horizontally-scrollable single-row swipe strip at every width
  below `xl` (identical to the mobile-only treatment from #1), then `grid-cols-5` in one row from
  `xl` (1280px) up, where all 5 genuinely fit. No intermediate grid step, so no orphan and no
  uneven stack at any width.
- **Reusable rule:** for a fixed tile count that doesn't divide evenly, don't hunt for the "least
  bad" intermediate grid — a single-row scrollable strip below the point of genuine fit is more
  predictable than any partial-grid compromise, and this is now the standing default (documented in
  `UI_CONVENTIONS.md` §9) rather than something to re-derive per screen. If a future screen has a
  tile count that *does* divide evenly (4, 6, …), an intermediate grid step is fine — this rule is
  specifically about counts that don't.
- **Expected side effect, verified against a real screenshot, not a follow-up bug:** below `xl`,
  the strip legitimately shows some whole cards plus a card **partially cut off at the trailing
  edge** (confirmed at a devtools-narrowed width sitting just under 1280px). That's the swipe
  strip's scroll affordance working as designed ("there's more, scroll →"), not a fifth intermediate
  layout bug to chase — don't reintroduce a grid step to make the trailing card "fully visible."

### 25. Payment History (`/app/payment-history`) — full playbook pass, plus one new bug
`src/pages/SubcribedPatients.tsx` (1487 lines, the biggest of the three screens covered so far —
dual mobile-card/desktop-table layout, a slide-in transaction detail drawer, a reusable
`FilterDropdown`, 4 stat cards, grouped-transaction merging logic) got the same treatment as
appointments and patients:
- **Dark-mode/token sweep**: the same `bg-white`/redundant-`dark:`-hex/raw-`slate-*` patterns
  throughout — stat cards, both filter dropdowns, the table, the mobile cards, and the entire
  transaction detail drawer (payment/patient/doctor info sections, close button, copy button).
- **New bug not seen on the other two screens**: the TXN-ID copy control in the drawer was a
  **clickable `<span onClick=...>` with no `role`, `tabIndex`, or keyboard handler**, sitting
  directly next to a `FiCopy` icon `<button>` that did the exact same "copy to clipboard" action —
  two redundant controls, one of them completely unreachable by keyboard. Merged into a single
  `<button aria-label="Copy transaction ID">` containing both the text and the icon.
- **Touch targets**: the drawer's close button (`FiX`) and the mobile card's "view details"
  (`FiEye`) button were both a fixed 32px (`h-8 w-8`) with no responsive scale — given the standard
  `h-10 w-10 lg:h-8 lg:w-8` ladder.
- **Mobile filter collapse**: like Patients before this pass, the toolbar never had the
  `mobileFiltersOpen` collapse behind a "Filters" button — on mobile all 6 controls (search,
  date-nav, type, status, mode, doctor) rendered stacked full-height. Added the same pattern used
  on the other two screens.
- **4-card stat grid**: applied the same swipe-strip + single-breakpoint-grid pattern from #24 for
  consistency, even though 4 (unlike 5) divides evenly and wouldn't strictly need it — one visual
  pattern across all three screens rather than a special case here.
- **Header**: migrated off its own hand-rolled `<h2>`/`<p>` (in **both** the normal view and the
  "payment visibility is off" early-return view) onto the shared `PageHeader`, matching #20's
  standard. This screen doesn't have a primary "+ New X" action, so `PageHeader`'s `actions` slot
  is simply unused here — the migration is worth doing anyway for the token/structure consistency.
- **Componentized** into `pages/paymentHistory/components/{list,toolbar}/` +
  `pages/paymentHistory/helpers/paymentHistoryFormatters.ts` + `src/types/paymentHistory/`,
  following the established folder pattern. The file itself (`SubcribedPatients.tsx`, kept at its
  existing top-level `pages/` location and existing filename — including its pre-existing typo —
  since renaming/moving it would touch `routes.ts` and add risk for no benefit) is now composition
  + state/queries only.
- **Reusable rule:** a page that's the biggest/most complex of a set is not a reason to skip the
  same audit — it's exactly where an unseen bug (the redundant unreachable copy control) turns up,
  because more surface area means more chances for one control to slip past keyboard testing.
  Run `PAGE_AUDIT_CHECKLIST.md` against it item by item rather than "spot checking" a large file.

### 26. The collapsed mobile filter panel wasted vertical space on all three screens
- **Symptom:** with the mobile "Filters" toggle expanded, every secondary filter
  (status/mode/doctor on Payment History; status on Appointments; gender/status/date/age on
  Patients) rendered on its **own full-width row**, even at tablet widths (e.g. ~700-1000px) where
  2-3 of them could easily fit side by side. This was visible on Payment History first, but it was
  the same underlying bug on all three screens — just never seen before, because none of them had
  a collapse toggle to expand and reveal it until this pass.
- **Root cause:** the collapsed panel's wrapper was `flex flex-col ... lg:flex-row lg:flex-wrap`,
  switching from column to row-wrap only at `lg` (1024px). But each individual filter control
  (`FilterDropdown`, `StatusFilterDropdown`, the `Select`s on Patients) is already sized
  `w-full sm:w-[Npx]` — i.e. it becomes a **fixed, wrappable width starting at `sm`** (640px). The
  parent forcing single-column layout all the way to `lg` meant a ~400px gap in the breakpoint
  range (640-1023px) where individual filters were sized to sit in a row but the container
  wouldn't let them.
- **Fix:** changed the collapsed panel wrapper to `flex flex-row flex-wrap items-center gap-3
  lg:w-auto` (no `flex-col`, no `lg:` gate on the row/wrap behavior) in `AppointmentToolbar.tsx`,
  `PatientFiltersToolbar.tsx`, and `PaymentToolbar.tsx`. Below `sm`, each filter is still `w-full`
  so it naturally wraps to its own row anyway (flex-wrap on 100%-width children behaves the same
  as flex-col) — nothing changes for narrow phones. From `sm` up, filters now actually wrap 2-3 per
  row instead of one-per-row, cutting the expanded panel's height significantly.
- **Reusable rule:** when a child element has a responsive fixed-width breakpoint
  (`w-full sm:w-[Npx]`), check that its **parent's flex-direction/wrap** doesn't have a *later*
  breakpoint gate than the child's own — a child that "can wrap starting at sm" is wasted if the
  parent only allows wrapping starting at lg. `flex-col` → `lg:flex-row` is a common pattern for
  "stack on mobile, row on desktop," but it's wrong whenever children below `lg` are already sized
  for a multi-column row, not for full-width stacking.

### 27. `SubcribedPatients.tsx` lived at the wrong directory level from its own components
- **Symptom:** when #25 split the payment-history page into
  `pages/paymentHistory/components/{list,toolbar}/` + `pages/paymentHistory/helpers/`, the main
  page file itself was deliberately left at its original location, `pages/SubcribedPatients.tsx` —
  one directory level *above* the folder holding the pieces it composes, unlike `Appointment.tsx`
  and `Patient.tsx` which both sit directly inside their own feature folder.
- **Fix:** moved the file to `pages/paymentHistory/PaymentHistory.tsx` — both the new location
  *and* a new name (the old name was a pre-existing typo — "Subcribed" — and no longer described
  the page's purpose; it was a legacy name from before this was a payment-history screen). Updated
  the component identifier and default export to `PaymentHistory`, fixed every relative import path
  one level deeper, and updated `routes.ts`'s import. **Deliberately left the route's own `key:
  "subscribedPatients"` and `path: "payment-history"` unchanged** — `components/shared/Sidebar.tsx`
  compares against that literal key string (`if (itemKey === "subscribedPatients")`), so renaming
  it would require updating Sidebar.tsx too, which is a separate, higher-blast-radius change not
  needed for "better file/folder structure."
- **Reusable rule:** when extracting a page into `components/`/`helpers/` subfolders, check whether
  the *main file itself* also needs to move to sit alongside them — a split that leaves the parent
  file at a different directory level than the folder it now depends on is inconsistent with the
  other reworked screens, even though nothing is functionally broken. When renaming a file that's
  also a route's `element`, grep the whole repo for both the old **filename** and the old
  **exported identifier** before considering it done, and check whether anything (like a sidebar's
  active-item highlighting) keys off the route's own `key`/`path` string separately from the
  component — those often should NOT be renamed even when the file/component are, since other code
  may depend on that string's stability independent of the file structure.

### 28. The stat-card swipe strip's "scroll for more" wasn't discoverable on desktop
- **Symptom:** on a viewport just below the strip's `xl` breakpoint (a common case: a wide window
  with browser devtools docked, pushing the content area under 1280px), the trailing stat card is
  partially cut off at the edge — #24 documented this as the intended scroll affordance. But with a
  mouse (no touch/swipe gesture available), there was **no visible way to discover that scrolling
  reveals it** — the container used `scrollbar-hide`, so desktop/mouse users had no scrollbar to
  grab and no other hint besides the cut-off edge itself.
- **Fix, v1:** replaced `scrollbar-hide` with an always-visible thin scrollbar
  (`[scrollbar-width:thin] [scrollbar-color:#9ca3af_transparent] [&::-webkit-scrollbar]:h-1.5 ...`)
  on all three `*StatCards.tsx` components.
- **Fix, v2 (after user feedback — "hide it, only show while scrolling")**: an always-visible
  scrollbar was judged too much permanent visual clutter under a clean card row. Changed to a
  scrollbar that's **transparent at rest** and only fades to visible on `hover`/`active`:
  `[scrollbar-color:transparent_transparent] hover:[scrollbar-color:#9ca3af_transparent]
  active:[scrollbar-color:#9ca3af_transparent]` (Firefox/standard) and
  `[&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-gray-400`
  (WebKit) — track stays `h-1.5`/transparent either way, so the layout doesn't shift when the thumb
  appears. Touch users still get the swipe gesture; mouse users get a scrollbar the moment they
  hover/drag the strip, not one sitting there permanently.
- **Reusable rule:** a horizontally-scrollable strip with `overflow-x-auto` needs *some* scrollbar
  affordance for mouse/trackpad users — never `scrollbar-hide` outright — but default to the
  hover/active-reveal variant above rather than a permanently-visible one, to keep the row visually
  quiet at rest. Reserve an always-visible scrollbar for wide data surfaces like tables, where a
  faint scrollbar under the header row is expected UI chrome rather than clutter.

### 29. The collapsed filter panel disappeared entirely on desktop — a regression from #26
- **Symptom:** on all three screens (Appointments, Patients, Payment History), the secondary
  filters (status/date/gender/etc.) were **completely missing on desktop by default** — not just
  visually cramped, actually not rendered at all — because `mobileFiltersOpen` defaults to `false`
  and nothing forced the panel visible at `lg` and above.
- **Root cause:** entry #26's fix changed the collapsed-panel class list from
  `mobileFiltersOpen ? "flex" : "hidden", ..., "lg:flex lg:flex-row lg:flex-wrap"` down to
  `mobileFiltersOpen ? "flex" : "hidden", ..., "lg:w-auto"` — dropping the `lg:flex` override in
  the process of simplifying the row/wrap classes. Below `lg` this is harmless (the mobile Filters
  toggle still controls visibility as intended), but at `lg` and above, `hidden` from the ternary is
  no longer beaten by anything, since `lg:flex` no longer exists to override it. The panel is
  visible only in the accidental case where `mobileFiltersOpen` happens to be `true` (e.g. right
  after toggling it open below `lg` and then resizing up) — never on a fresh desktop load.
- **Fix:** restored `lg:flex` alongside `lg:w-auto` in the class list on all three toolbars
  (`AppointmentToolbar.tsx`, `PatientFiltersToolbar.tsx`, `PaymentToolbar.tsx`), so from `lg` up the
  panel is unconditionally visible regardless of `mobileFiltersOpen`, matching the pre-#26 behavior,
  while keeping #26's `flex-row flex-wrap`-from-the-base-breakpoint fix for the collapsed-mobile
  case intact.
- **Reusable rule:** a `condition ? "flex" : "hidden"` pattern gated by mobile-only state
  **always** needs an explicit `lg:flex` (or whatever the "always visible from here up" breakpoint
  is) paired with it — the responsive override must restate the display value, not just adjust
  layout (`flex-direction`/`wrap`/`width`). When editing a class list built from multiple
  conditional strings, diff the *set of Tailwind property namespaces* before and after (display,
  direction, wrap, width, …) — dropping a class that looked redundant at a glance (`lg:flex` looks
  like it's "just" restating `flex`) can silently remove the one override responsible for beating
  the ternary's `hidden` at wider breakpoints.

### 30. No-Show page (`/app/no-show`) — a fourth color trap: raw palette colors with zero dark handling
`src/pages/noshow/NoShowPage.tsx` (816 lines, single file, no `components/`/`helpers/`/`types/`
split, hand-rolled header) got the full pass:
- **New bug class, distinct from #1/#2/#23**: `ActionStatusChip` and `NoShowCountBadge` used raw
  Tailwind palette steps with **no `dark:` pairing at all** — `bg-yellow-50 text-yellow-700
  border-yellow-200`, `bg-orange-50 text-orange-700 border-orange-200`, `bg-red-50 text-red-700
  border-red-200`. Unlike `slate` (auto-inverts via `.dark`) or `white` (intentionally frozen),
  `yellow`/`orange`/`red`/`blue`/`green` have **no remap in `.dark` at all** — they're ordinary
  Tailwind colors. A `-50` background is a very light, near-white tint; over a dark page it renders
  as a jarring bright patch, not merely "a bit washed out." The patient/doctor avatar icon circles
  (`bg-blue-100`/`bg-green-100`) had the identical issue.
- **Fix:** switched every one of these to the alpha-based pattern already used ad hoc for
  `advance_required` in this same file (`bg-primary/10`): `bg-{color}-500/10` for the background
  (a translucent tint that reads correctly against both a light and dark page, since it composites
  against whatever's underneath) paired with `text-{color}-700 dark:text-{color}-400` and
  `border-{color}-500/20`. This is now the standing pattern for a semantic accent color that isn't
  one of the app's tokenized values (success/warning/danger/info) but still needs to render
  correctly in both themes — see `ActionStatusChip.tsx`, `NoShowCountBadge.tsx`.
- **Componentized** into `pages/noshow/components/{list,toolbar}/` + `pages/noshow/helpers/
  noShowFormatters.ts` + `src/types/noshow/`, following the established pattern; migrated the
  hand-rolled `<h2>`/`<p>`/button header onto `PageHeader` (title/description/actions), with the
  existing `FeatureInfoTip` passed via `PageHeader`'s `titleExtra` slot.
- **Touch targets**: the List/Grid view-toggle buttons were a fixed `h-10 w-10` (correct at the
  base size but never stepped down); added the standard `lg:h-8 lg:w-8` half of the ladder, plus
  `aria-pressed` (was missing) alongside the existing `aria-label`.
- **Not changed**: this screen's toolbar (search + date-range + view toggle, only 2-3 controls) was
  left without a mobile "Filters" collapse toggle — unlike the three previous screens, there's no
  multi-filter overflow problem here to solve, so adding the collapse pattern would be unnecessary
  complexity, not a fix. `PatientNoShowHistoryPage.tsx` (the linked patient-history sub-route) was
  **not** touched in this pass — flagged as a follow-up screen, not silently skipped.
- **Reusable rule:** when auditing a screen for dark-mode bugs, the `dark:.*slate-[0-9]` /
  `bg-white\b` greps from the playbook don't catch this class — also grep for
  `bg-(red|orange|yellow|green|blue|purple|pink)-(50|100)\b` with no adjacent `dark:` pair. Any raw
  light-toned Tailwind palette background used as a status/accent chip should default to the
  `bg-{color}-500/10` + `text-{color}-700 dark:text-{color}-400` + `border-{color}-500/20` pattern
  rather than the `-50`/`-100` + un-paired-dark pattern, whether or not dark mode is being actively
  tested at the time.

### 31. `NoShowTable` didn't match the other three tables' scaffolding or interaction behavior
- **Symptom:** the No-Show table looked broadly similar to Appointment/Patient/Payment History's
  tables (same tokens, same header style after #30's color-trap fix) but behaved differently in
  several ways: the row itself wasn't clickable (only a small icon button in an Action column
  opened details), patient/doctor cells used static colored-circle icons instead of the shared
  `Avatar` component, the loading skeleton was a bespoke per-column shape instead of the shared
  `SkeletonBlock` pattern, and the empty state was a full custom SVG-illustration component swapped
  in at the page level instead of an inline `<tr>` message — plus a separate custom rows-per-page
  `<select>` instead of the button+listbox dropdown the other three tables use.
- **Root cause:** this screen was built independently before the "canonical table shape" was
  established as an explicit rule (it only existed as convergent practice across three files, never
  written down) — nothing forced a fourth table to notice the pattern, so it reproduced the general
  look (tokens, spacing, header style) without reproducing the actual interaction behavior.
- **Fix:** rewrote `NoShowTable.tsx`/`BottomControls.tsx`/`NoShowCardGrid.tsx` to match the shape
  documented in `UI_CONVENTIONS.md` §1 ("The canonical `<Feature>Table.tsx` shape"): whole-row
  click + keyboard handling (mirroring `TransactionTable`'s fullest version), `Avatar`-based
  identity cells, the shared `SkeletonBlock` loading shape (added `components/list/SkeletonBlock.tsx`
  to the noshow feature to match), an inline empty-state row, and the button+listbox rows-per-page
  control. Removed the now-redundant per-row "view" icon button (the row click already does the
  same thing — see #25) and deleted the bespoke `NoShowEmptyState.tsx` illustration component and
  its `Skeletons.tsx` (both now unused).
- **Reusable rule:** when a fourth (or Nth) similar screen is built, "looks right at a glance" is
  not the same as "behaves the same" — a table can pass a visual review while still having a
  non-clickable row, a mismatched skeleton, or a redundant control, none of which show up in a
  static screenshot. This is exactly why the shape is now written down as an explicit rule
  (`UI_CONVENTIONS.md` §1) instead of left as tribal knowledge inferred from reading three existing
  files — check new tables against that written rule, not against "does it look similar."

### 32. Status/count chips used a bordered-outline pill instead of the shared dot-chip look
- **Symptom:** after #30/#31 fixed color and table-shape parity, `ActionStatusChip` and
  `NoShowCountBadge` still visually stood out — bordered pill (`border` + icon + text) — against
  every other table's status column, which uses `components/shared/StatusChip.tsx`: a borderless
  HeroUI `Chip` with `variant="dot"` (colored fill + small leading dot, no border, no icon).
- **Root cause:** `StatusChip`'s built-in status-key mapping (completed/cancelled/pending/confirmed/
  noshow/unknown) doesn't cover this screen's semantics (warning/penalty/advance_required/blocked/
  no-show), so it was never reused directly — but its *visual pattern* wasn't reused either, even
  though nothing about the pattern is status-set-specific.
- **Fix:** rebuilt both `ActionStatusChip` and `NoShowCountBadge` as their own `Chip variant="dot"`
  with the same `classNames` shape as `StatusChip` (`h-auto rounded-md border-none px-3 py-1.5`,
  `text-xs font-medium` content, `w-1.5 h-1.5 !bg-current` dot), keeping only the color-per-status
  mapping distinct. Dropped the leading icon glyphs (`FiAlertTriangle`, etc.) since the dot already
  carries that role in every other status chip on the app.
- **Reusable rule:** when a screen's status/count values don't fit an existing shared component's
  *data* mapping, that's a reason to build a sibling component with the same *visual* pattern
  (`Chip variant="dot"`, same `classNames` shape) — not a reason to invent a different chip style
  from scratch. A bordered-pill chip next to a borderless dot-chip in the same table row reads as an
  inconsistency even when each individually is legible and on-token.

### 33. `NoShowCardGrid` diverged from `AppointmentCardGrid`'s card shape and behavior
- **Symptom:** compared directly against `AppointmentCardGrid.tsx`, the No-Show card view had
  several of the same category of gap the table had before #31: a separate "Details" button doing
  what the card itself should do, static colored-circle icons instead of `Avatar`, no "doctor info
  strip" treatment, a skeleton shape that didn't match the real card's sections, a plain-text empty
  state instead of the bordered-card empty state, and — missing outright — no pagination controls
  under the grid view at all (`BottomControls` was only ever mounted inside `NoShowTable`).
- **Fix:** rewrote `NoShowCardGrid.tsx` to mirror `AppointmentCardGrid.tsx`'s structure: the whole
  card is `role="button" tabIndex={0]` with `onClick`/`onKeyDown` (removed the redundant "Details"
  button — same reasoning as #25/#31), `Avatar`-based header + a `rounded-xl bg-surface-muted`
  "doctor strip", an appointment-info strip, a bottom row (status dot + text left, `ActionStatusChip`
  right), a skeleton shaped like the real card's sections, a bordered-card empty state
  (`rounded-2xl border border-line bg-surface p-10 text-center`), and a `BottomControls` mounted at
  the bottom with `variant="plain"` (added that variant to the noshow feature's own
  `BottomControls.tsx`, matching the appointment feature's). Added the pagination props to
  `NoShowCardGridProps` (extracted as a shared `NoShowPaginationProps` interface, reused by
  `NoShowTableProps` and `BottomControlsProps` too) and wired them through from `NoShowPage.tsx`
  into both the always-cards mobile section and the desktop grid-view section.
- **Reusable rule:** when a screen has both a table and a card/grid layout, audit them **against
  their own respective canonical references separately** — fixing the table to match
  `AppointmentTable`/`PatientTable`/`TransactionTable` doesn't automatically fix the card view to
  match `AppointmentCardGrid`, since they're different components with their own established shape.
  A missing feature entirely (pagination under the grid view here) is easy to miss in an audit that
  only compares *styling* — checking "does every interactive affordance the reference component has
  also exist here" catches gaps a visual diff won't.

### 34. `SearchField`'s own default styling had the raw-slate/`bg-white` bugs — broke every
consumer that didn't override `classNames`
- **Symptom:** on the No-Show page, the search input rendered visibly wrong in dark mode (white
  box, dark-on-dark placeholder) even though the surrounding toolbar was fully tokenized.
  `AppointmentToolbar`/`PatientFiltersToolbar`/`PaymentToolbar` don't show this bug because each of
  them passes its own `classNames` override to `SearchField` — but `NoShowToolbar` (and, it turned
  out, several other unrelated screens: `PharmacyMedicine.tsx`, `NewInvoice.tsx`,
  `ProfileRequest.tsx`, `RequestPage.tsx`, `ReferralsPage.tsx`) used `SearchField` with no override,
  which meant they inherited the component's own **default** `classNames` — and those defaults were
  never tokenized: `bg-white` (the frozen-white trap, #6/#23), `border-slate-200`/`text-slate-700`/
  `text-slate-400` (the auto-inverting-but-never-actually-overridden slate trap, #1).
- **Root cause:** `components/shared/SearchField.tsx` predates the tokenization pass entirely — its
  hardcoded `classNames` were never touched because every high-traffic consumer happened to already
  override them, masking the bug until a screen that *didn't* override them was built.
- **Fix:** tokenized `SearchField`'s own defaults (`bg-white` → `bg-surface`, `border-slate-200` →
  `border-line`, `text-slate-700` → `text-text`, `placeholder:text-slate-400`/icon/clear-button
  `text-slate-400` → `text-text-subtle`, hover `border-slate-300` → `hover:border-primary/40`) —
  this fixes every current and future consumer that doesn't pass its own override, not just the
  No-Show page. Also restructured `NoShowToolbar.tsx` to match the established toolbar shape
  (`AppointmentToolbar`/`PaymentToolbar`): `w-full lg:w-[320px]` search width, prev/next date-shift
  chevron buttons around `DashboardDateRangePicker` (added a `shiftDateByOneDay`-style handler to
  `NoShowPage.tsx`, mirroring `PaymentHistory.tsx`'s), and swapped the page-level `mt-3 rounded-xl`
  wrapper for the plain `mt-4` spacing-only wrapper the other toolbars use (no card/border around
  the toolbar itself).
- **Reusable rule:** a shared primitive's own hardcoded defaults are exactly as capable of carrying
  the color-trap bugs as page-level code — and are *more* dangerous, because a consumer that already
  overrides `classNames` (the majority, since that's how most pages were built) never exposes the
  bug, so it lingers until a new consumer skips the override. When grepping for `bg-white`/
  `dark:.*slate-[0-9]` across a screen, also check any shared component it renders for the same
  patterns in the component's *own* default styling, not just the screen's usage of it.

### 35. Two more No-Show gaps found on a closer pass: a radius mismatch and a missing spacing wrapper
- **Symptom 1 (shape):** `SearchField`'s search box rendered visibly rounder than the buttons
  sitting right next to it in the same toolbar row (the date-nav chevrons, view toggle) — a pill-ish
  shape against otherwise-`rounded-lg` (8px) siblings.
- **Root cause 1:** `SearchField` passes HeroUI's `radius="lg"` **Input prop**, which resolves to
  HeroUI's own `rounded-large` design token — a materially rounder corner than Tailwind's
  `rounded-lg` utility class used directly on every sibling button. Two different "lg" scales, same
  name, different values — this exists on every screen using `SearchField`, not just No-Show; it
  just hadn't been directly compared side-by-side against its sibling buttons before.
- **Fix 1:** added `!rounded-lg` to `SearchField`'s own `inputWrapper` classNames (in the shared
  component, same as #34) to force the same 8px Tailwind radius as every neighboring control,
  regardless of what HeroUI's own `radius="lg"` token would otherwise render.
- **Symptom 2 (spacing):** the table/card content sat with **zero gap** directly under the
  toolbar — `NoShowPage.tsx` wrapped the toolbar in its own `mt-4` div and the table/grid section in
  a separate, unrelated `hidden md:block` div with no top margin at all.
- **Root cause 2:** `Appointment.tsx` gets this gap "for free" because it wraps its toolbar *and*
  its list view in one shared container: `<div className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">` —
  `space-y-*` puts a consistent gap between every direct child. `NoShowPage.tsx` never adopted that
  single-wrapper pattern; each section had its own disconnected spacing decision.
- **Fix 2:** wrapped the toolbar, the mobile-cards section, and the desktop table-or-grid section
  in one `mt-4 space-y-3 sm:mt-5 sm:space-y-4` container (byte-identical spacing scale to
  `Appointment.tsx`), removing the now-redundant per-section `p-3`/`p-4` wrappers — the page shell's
  own `<main>` padding (`Layouts/MainLayout.tsx`) already provides edge spacing, so those inner
  wrappers were adding nothing but inconsistency.
- **Reusable rule:** when a page's toolbar and content list are spaced independently (each section
  choosing its own margin) instead of sharing one `space-y-*` container, gaps between sections drift
  screen-to-screen even when every individual section looks "reasonably spaced" in isolation. Copy
  the single-wrapper `mt-4 space-y-3 sm:mt-5 sm:space-y-4` pattern wholesale rather than picking
  per-section margins. Confirmed via `MainLayout.tsx`'s `<main>` element that the page shell already
  supplies horizontal/vertical edge padding — a page's own root content should not add a redundant
  outer `p-3`/`p-4` "just in case."

### 36. Copying Appointment's exact `lg`/`xl` toolbar breakpoints onto a lighter toolbar left a dead zone
- **Symptom:** on a moderately narrow viewport, the No-Show toolbar showed search on its own full
  row, then the date-nav row, then the view-toggle buttons stranded on a *third* row below both —
  even though there was clearly enough horizontal room for date-nav and the view toggle to share a
  row at that width.
- **Root cause:** `NoShowToolbar` copied `AppointmentToolbar`'s exact two-tier breakpoint scheme
  (inner search/date group goes row at `lg`, outer group vs. view-toggle goes row at `xl`) verbatim.
  That scheme is sized for Appointment's *denser* toolbar (search + date-nav + a status dropdown +
  view toggle) which genuinely needs `lg`/`xl` worth of width before everything fits inline.
  No-Show's toolbar has far less content (search + date-nav + a 2-button view toggle) and doesn't
  need nearly that much width — but the view toggle was already set to appear at `md` (`md:flex`),
  so between `md` and `xl` it sat visible-but-orphaned on its own row while the rest of the toolbar
  was still column-stacked.
- **Fix:** lowered both breakpoint tiers to `md` uniformly (inner group `md:flex-row
  md:flex-wrap`, outer group `md:flex-row md:justify-between`, search width `md:w-[280px]
  lg:w-[320px]`) so everything transitions to a single row at the same breakpoint the view toggle
  already appears at — no gap zone.
- **Reusable rule:** don't copy a reference toolbar's breakpoint tier without checking whether the
  new toolbar has a comparable amount of content — a toolbar with fewer controls should transition
  to row-layout at a **lower** breakpoint than a denser one, or a lighter toolbar ends up wasting
  height (and stranding any element whose own visibility breakpoint doesn't match the parent's
  row-transition breakpoint) at moderate widths where it could easily already be inline.

### 37. Mobile still showed every filter permanently expanded, unlike every other screen
- **Symptom:** compared against Appointment/Patient/Payment History on a phone-width screenshot,
  No-Show's mobile toolbar showed search *and* the full date-nav row unconditionally — two full-
  width rows every time — while the other three screens show only a compact search + "Filters"
  toggle row by default, with secondary filters collapsed until tapped.
- **Root cause:** the earlier No-Show toolbar pass (entry #34) copied the *structural* shape
  (search sizing, date-nav chevrons) from `AppointmentToolbar` but not the `mobileFiltersOpen`
  collapse behavior, on the reasoning that "only 1-2 filters don't need collapsing" — but that
  reasoning optimized for desktop width, not mobile height, where even one extra permanently-shown
  row is a real difference from the established pattern every other screen follows.
- **Fix:** added `mobileFiltersOpen`/`setMobileFiltersOpen` state to `NoShowPage.tsx` and the same
  `FiSliders` "Filters" toggle button + collapsed-panel wrapper pattern used by the other three
  toolbars (with the `md:flex` override included alongside `md:w-auto` — see #29 for why omitting
  it silently breaks desktop visibility) so date-nav collapses behind the toggle below `md`.
- **Reusable rule:** "this toolbar has fewer filters" is a reason to simplify the *desktop* layout,
  not a reason to skip the mobile collapse pattern outright — a phone screen's vertical space is
  scarce regardless of how many filters there are, and a screen with one collapsible control still
  benefits from not showing it by default. Compare a new toolbar against the established pattern at
  **both** the desktop-width and phone-width ends, not just one.

### 38. The List/Grid view toggle was hidden on mobile, force-locking the layout instead of letting the user choose
- **Symptom:** on a phone-width screenshot, there was no way to switch between list (table) and
  grid (card) view — the toggle buttons were `hidden ... md:flex`, and the page itself hardcoded a
  separate "mobile: always cards" block regardless of `viewMode`.
- **Root cause:** `AppointmentToolbar`'s `ViewToggle` has **no** breakpoint gate at all — it's
  visible on every screen size, and `AppointmentListView` renders purely off the `view` state, with
  no width-based override. No-Show's earlier passes (entries #30-#37) copied the toolbar's
  *structural* shape but never actually compared this specific behavior: whether the view toggle
  itself should be breakpoint-gated. It was modeled closer to Payment History's `TransactionCards`/
  `TransactionTable` split (which genuinely is `md:hidden`/`hidden md:block`, no user-facing toggle
  at all) while still keeping a toggle UI that implied user choice — an inconsistent hybrid of two
  different established patterns.
- **Fix:** removed the `hidden md:flex` from the view-toggle button group (now `flex` at every
  width) and removed `NoShowPage.tsx`'s separate breakpoint-forced "mobile: always cards" /
  "desktop: table or grid" blocks, replacing them with a single `viewMode === "grid" ? <NoShowCardGrid
  /> : <NoShowTable />` — identical in shape to how `AppointmentListView` dispatches. `NoShowTable`
  already has `overflow-x-auto` + a `min-w`, so a table chosen on a phone scrolls horizontally
  rather than breaking the page (the same rule from entry #4).
- **Reusable rule:** when a screen offers a visible view-toggle control, that toggle should be the
  **only** thing deciding the layout — don't also force an override based on viewport width, or the
  toggle either becomes misleading (visible but ignored) or gets hidden altogether at the width
  where the override kicks in. If a screen genuinely wants a fixed mobile layout with no user choice
  (like Payment History's cards-only-on-mobile), don't render a toggle UI at all in that state —
  showing a toggle implies the layout is a choice, not a fixed default.

### 39. Admin Dashboard (`/app/dashboard`, `AdminDash.tsx` + its component tree) — a full pass on a ~4,000-line, high-risk area
- **Scope note, stated up front by the user**: this area was explicitly flagged as "too complex" —
  ~4,000 lines across 8 files, dominated by a 1,834-line monolith (`AdminDash.tsx`) with heavy
  `useMemo` data-shaping logic feeding several live dashboard API queries. The pass was scoped to
  **tokens/dark-mode/accessibility only** — no data-fetching, `useMemo`, or event-handler logic was
  touched, and `AdminDash.tsx` was **not** split into `components/` this round (real, valuable
  follow-up work, deliberately deferred rather than bundled into a riskier single pass). Every file
  was verified with `eslint` + `tsc -b` individually before moving to the next, and a full
  `npm run build` ran at the end — not just incremental `tsc -b`.
- **`CustomDateRangePicker.tsx` had a genuine invisible-text bug**: `dark:text-slate-200` on the
  default calendar-day-number color resolves to `#273244` (slate-200's dark-mode value) — a dark
  navy rendered directly on the dark page background, nearly invisible. This is the exact `dark:
  slate-N` trap from #13, just newly found in a file that had never been audited before.
- **`StatusBadge` (pending-appointments table) was the `bg-{color}-50`-with-zero-dark-handling bug
  (#30) again**: `bg-[#fef9c3]`/`bg-[#dcfce7]`/`bg-[#dbeafe]`/`bg-[#fee2e2]` status pills with no
  `dark:` pairing at all. Fixed with the established alpha pattern (`bg-{color}-500/10
  text-{color}-700 dark:text-{color}-400`).
- **`RevenueOverviewChart.tsx` needed a different fix mechanism than className swaps**: its
  grid-line/axis-tick colors are recharts *props* (`stroke`, `tick.fill`), not CSS classes — `dark:`
  Tailwind variants don't apply to them at all. Wired in the existing `useTheme()` hook
  (`src/hooks/useTheme.ts`) to pick a light/dark color pair at render time instead. This is the same
  category of "needs more than a className edit" fix as #16 (hook re-render scoping) and #22
  (transition CSS) — dark-mode bugs aren't always fixable with a `dark:` prefix.
- **Fixing `StatCard.tsx`'s dark-mode handling would have broken 4 unrelated pages**: `StatCard` is
  a shared root-level component (`src/components/StatCard.tsx`) also used by `DoctorDash.tsx`,
  `ReceptionistDash.tsx`, `PharmacistDashboard.tsx`, and `LabDash.tsx` — none of which were in this
  pass's stated scope. Its icon-background wrapper had a blanket `dark:bg-[#172033]` fallback
  papering over every caller's `bgColor` prop, forcing all icon colors to the same dark navy
  regardless of intent. Removing that blanket override (to let each caller's own alpha-safe color
  show through, matching entry #30) would have **broken those 4 other pages**, which still passed
  solid non-alpha hex values (`bg-[#e6fbf7]`, `bg-[#fff7e6]`, `bg-[#eef1ff]`, etc.) that relied on
  the blanket fallback to not render a bright box in dark mode. Fixed all 5 pages' `bgColor` values
  to the alpha-based pattern (`bg-{color}-500/10`) before removing the fallback, so nothing regressed.
- **`PageHeader` migration was deliberately skipped, not silently missed**: unlike every other
  remediated page, `AdminDash.tsx`'s header pairs the title with a full filter/date-range toolbar
  (not a compact button). `PageHeader`'s `actions` slot forces title+actions onto one row at every
  breakpoint (per #21) — appropriate for a button, but forcing a whole toolbar into that same rigid
  layout risked breaking the header on mobile/tablet, which the user explicitly said must not
  happen. Left the existing custom header in place (now token-fixed) rather than force a component
  fit that doesn't match the content shape.
- **A11y gaps fixed**: three clickable `<div>`/`<tr>` elements with `onClick` but no
  `role="button"`/`tabIndex`/`onKeyDown` (a no-show alert card, a reminder-appointment row, and the
  pending-appointments table row) — same pattern as #19's original `<th onClick>` finding, just in
  new locations. The patient-search dropdown got `aria-haspopup="listbox"` on the input and
  `role="listbox"`/`role="option"` on the results panel/items (the established pattern from #15).
- **Reusable rule**: a large, high-risk file doesn't mean skip the audit — it means split the audit
  into smaller, independently-verified steps (per-file, then per-section within the monolith), and
  be willing to say "not this pass" out loud for anything that would multiply risk (structural
  splits, forcing a shared component into a shape that doesn't fit) rather than force it in. Also:
  before changing a shared component's *default* behavior, grep for every consumer, not just the
  one you're actively fixing — a shared component's "harmless-looking" fallback can be load-bearing
  for callers outside your current task.

### 40. Native `<button>`s across the Admin Dashboard inconsistently omitted explicit `cursor-pointer`
- **Symptom:** most buttons across `AdminDash.tsx` and its component tree (`CustomDateRangePicker.tsx`,
  `RevenueOverviewChart.tsx`) had no `cursor-pointer` class, while a handful of others in the same
  files (and in sibling dashboard files like `PharmacistDashboard.tsx`) did — an inconsistent,
  ad-hoc pattern rather than a deliberate choice either way.
- **Not a functional bug**: a native `<button>` already gets a pointer cursor from the browser by
  default (confirmed no `cursor: default` reset on buttons in this app's Tailwind preflight), so
  this wasn't broken in the sense of "the cursor is wrong" — but the codebase's existing convention,
  visible in the files that already had it, is to set `cursor-pointer` explicitly rather than lean on
  the browser default.
- **Fix:** added `cursor-pointer` to every `<button>`/clickable `<div>`/`<tr>` in
  `AdminDash.tsx`, `CustomDateRangePicker.tsx`, and `RevenueOverviewChart.tsx` that was missing it
  (the "View Full Schedule"/"View Full Report"/"View All Reminders" buttons, all four Quick Actions
  buttons, the patient-search result buttons, the pending-appointments table's reschedule/view
  buttons, the calendar's prev/next-month buttons, its Cancel/Done buttons, and the revenue-chart
  range dropdown trigger + its options). Left disabled buttons (`disabled` + `cursor-not-allowed`)
  untouched — those are correctly signaling "not clickable," not a gap.
- **Reusable rule:** even though native `<button>` elements don't strictly need `cursor-pointer` for
  correct behavior, this codebase's established convention is to set it explicitly and consistently
  — add it to every interactive element (buttons included) when doing a page pass, not just to
  non-button clickable `<div>`/`<tr>` elements (which *do* need it, since they have no native
  pointer-cursor behavior at all).

### 41. `AdminDash.tsx` (1,834 lines) split into the standard `components/`/`helpers/` structure
- **Context**: entry #39's harness pass deliberately deferred this split to limit risk on a single
  pass. The user then explicitly asked for it, scoped strictly to `AdminDash.tsx` (no other
  dashboard file touched).
- **What moved**: eleven inline sub-components (`SummaryBar`, `AIInsightsWidget`, `AlertsWidget`,
  `RemindersWidget`, `TopSymptomsCard`, `PatientOverviewCard`, `QuickActionsWidget`, `StatusBadge`,
  a skeleton (`Sk`) and an icon (`ArrowUpRight`)) plus two large inline JSX blocks that had never
  been their own components at all (the "Today's Appointments" table, and the patient-search
  input+dropdown) — extracted into `pages/dashboard/adminDash/components/`. All formatter/parser
  functions (`toYMD`, `formatINR`, `getGreeting`, `mergeDateTime`, `fmtTime12`, `initials`,
  `isFreeSubscription`, `normalizePhoneForDial`, etc.) moved to
  `pages/dashboard/adminDash/helpers/adminDashFormatters.ts`. Shared prop/data types
  (`PendingAppt`, `DashboardResultLoose`, and one `<Component>Props` interface per extracted piece)
  moved to `src/types/adminDash/index.ts`, following the established `src/types/<domain>/` pattern.
- **File move + import update**: `AdminDash.tsx` itself moved from `pages/dashboard/AdminDash.tsx`
  to `pages/dashboard/adminDash/AdminDash.tsx` (mirroring entry #27's precedent — the main file sits
  alongside its own `components/`/`helpers/`, not orphaned a directory level above them). The
  sibling dashboard files it still imports (`DateFilterTabs`, `CustomDateRangePicker`,
  `RevenueOverviewChart`, `DonutOverviewCard`, `DashboardFooter`) were deliberately **left in
  place** at `pages/dashboard/` — those are shared across other role-dashboards
  (`DoctorDash.tsx`, etc.), out of this pass's scope, so moving them would have widened the blast
  radius for no reason. Only the single consumer of the old path (`Dashboard.tsx`'s import) needed
  updating.
- **Zero behavior change**: this was a pure move-and-wire-via-props refactor — no hook, query,
  `useMemo`, or event-handler logic was altered, only where the code physically lives and how data
  crosses the new component boundaries. Verified with `eslint`, `tsc -b`, and a full `npm run build`
  after the split, same as every other file in this pass.
- **Reusable rule:** deferring a structural split during a large/risky harness pass is a legitimate
  call to make for the pass itself, but it's not a decision to make unilaterally forever — flag it
  explicitly (as this pass's entry #39 did) so it surfaces as a known follow-up rather than being
  silently forgotten. When actually doing the split later, treat it as strictly separate from any
  concurrent styling/logic work: a pure code-motion diff is much easier to verify as safe than one
  mixed with behavioral changes.

### 42. Receptionist Dashboard reproduced AdminDash's pre-harness bugs verbatim — the "second consumer" trigger point
- **Symptom:** `ReceptionistDash.tsx` (725 lines, single file) turned out to duplicate three of
  `AdminDash.tsx`'s pre-harness sub-components almost byte-for-byte: `Sk` (skeleton), `ArrowUpRight`
  (icon), and `StatusBadge` — the last one reproducing entry #30's exact bug (`bg-[#fef9c3]`-style
  raw palette pills with zero dark handling), plus a 5th status case ("No Show") AdminDash's copy
  didn't have. The rest of the file (header, doctor-filter dropdown, appointments table, quick
  actions, doctor-queue hint) had the same `text-[#677294]`/`text-[#100e1c]`/`dark:text-white`/
  `bg-white` patterns from entries #1/#2/#6, and the appointments table row was `onClick`-only with
  no `role="button"`/`tabIndex`/`onKeyDown` (the same gap as #19/#38's original finding).
- **This is the "wait for a second real consumer" trigger** (see `feedback_component_abstraction_timing`
  memory / prior guidance in this codebase): with two dashboards now needing the identical
  `Sk`/`ArrowUpRight`/`StatusBadge` pieces, promoting them to a shared location is no longer
  premature — it's exactly the point that rule exists for.
- **Fix:**
  - Promoted `Sk`, `ArrowUpRight`, `StatusBadge` to `pages/dashboard/components/` (a new
    cross-role-dashboard shared folder, sibling to `adminDash/` and `receptionistDash/` — not
    `components/shared/`, since these are dashboard-role-specific, not app-wide primitives).
    `StatusBadge` gained the "No Show" case in the shared version, so `AdminDash` picks it up too
    (a case it was silently missing, not a behavior regression).
  - Deleted the duplicate local copies from `adminDash/components/` and rewired its five consumers
    (`SummaryBar`, `RemindersWidget`, `TopSymptomsCard`, `PatientOverviewCard`,
    `PendingAppointmentsTable`, `AdminDash.tsx` itself) to import from the shared location.
  - Split `ReceptionistDash.tsx` into `pages/dashboard/receptionistDash/` following the exact same
    `components/`/`helpers/` + `src/types/receptionistDash/` structure just established for
    `AdminDash.tsx` (entry #41) — `QuickActionsWidget`, `DoctorFilterDropdown` (now with proper
    `aria-haspopup`/`role="listbox"`/`role="option"`), `AppointmentsTable` (now with row
    keyboard-accessibility, using the shared `StatusBadge`/`ArrowUpRight`), `DoctorQueueHint`.
  - Full token/dark-mode sweep on everything not already covered by the shared pieces.
- **Reusable rule:** when a page reproduces bugs already fixed elsewhere in the codebase almost
  verbatim (not just "a similar bug," but the *same* component copy-pasted with the *same* fix
  needed), that's stronger evidence to promote the shared piece than to fix each copy
  independently — fixing two duplicates in place would have re-introduced the exact
  "same bug in two places, fixed once" risk the whole promotion rule exists to prevent. Also: a
  shared piece being generalized for a second consumer (here, `StatusBadge`'s "No Show" case) should
  usually flow back to the first consumer too, not just serve the new one.

### 43. Doctor Dashboard — same color-trap sweep, plus another zero-dark-handling bug in `NotificationsPanel`
- **Context**: third role-dashboard in this series (`DoctorDash.tsx`, 1,374 lines). Reused the
  shared `Sk` skeleton from `pages/dashboard/components/` (entry #42) instead of its own duplicate
  copy — the same `bg-slate-200 dark:bg-[#172033]` local definition seen in the other two
  dashboards. `ArrowUpRight`/`StatusBadge` weren't applicable here — this dashboard's status labels
  (`TodaysAppointmentsList`'s "Now"/"Next"/"Upcoming"/"Done"/"No Show") are a different 5-state
  set with different visual treatment (colored pill, not dot-chip), so left as its own local
  logic rather than force-fitting the shared 4-state `StatusBadge`.
- **Mechanical token sweep**: ~60 occurrences of the same `text-[#100e1c] dark:text-white` /
  `text-[#677294] dark:text-white/NN` / `border-[#e5e7ea] dark:border-[#273244]` /
  `bg-white ... dark:bg-[#111726]` redundant-pair pattern from entries #1/#2, across
  `StartYourDayCard`, `TodaysAppointmentsList`, `QuickActionsGrid`, `PatientAlerts`,
  `RecentPatients`, `NotificationsPanel`, `ProTipsCard`, `SetupProgressBanner`.
- **New real bug**: `NotificationsPanel`'s notification-type icon badges (`tone: "bg-[#eef1ff]
  text-[#3b82f6]"` etc., one per notification type — lab report/patient waiting/follow-up/
  cancellation) had **zero** dark handling, the same category as entry #30's `StatusBadge` bug and
  #43's own sibling finding — fixed with the same alpha-based pattern
  (`bg-{color}-500/10 text-{color}-700 dark:text-{color}-400`). `PatientAlerts`' gradient dots
  (`from-[#ff5573] to-[#d93054]`, etc.) were **not** touched — those are small saturated decorative
  dots, not text-on-background contrast surfaces, so they render correctly in both themes as-is.
- **Deliberately not split into a `doctorDash/` folder this pass**: unlike `AdminDash`/
  `ReceptionistDash`, this file wasn't explicitly asked to be restructured, and effort was already
  heavily spent on this session's dashboard series — flagged as a legitimate follow-up (the file
  already uses real `<button>` elements for nearly every clickable surface, so its accessibility
  baseline was better than the other two dashboards going in; less urgency than the structural
  work already done).
- **Reusable rule:** not every shared piece applies to every sibling screen — `StatusBadge`'s
  4-state set didn't fit this screen's 5-state, differently-styled status labels, and forcing it in
  would have been a worse fit than leaving the local logic. Promote what genuinely matches; don't
  promote for the sake of promoting.

### 44. `DoctorDash.tsx` (1,370 lines) split into the standard `components/`/`helpers/` structure
- **Context**: entry #43 fixed this dashboard's colors/a11y but deliberately deferred the structural
  split (not explicitly requested at the time, effort already heavily spent). The user then asked
  for it explicitly, matching the `AdminDash`/`ReceptionistDash` treatment (entries #41/#42).
- **What moved**: eight inline sub-components (`StartYourDayCard`, `TodaysAppointmentsList`,
  `QuickActionsGrid`, `PatientAlerts`, `RecentPatients`, `NotificationsPanel`, `ProTipsCard`,
  `SetupProgressBanner`) extracted into `pages/dashboard/doctorDash/components/`. All formatter/
  parser functions moved to `pages/dashboard/doctorDash/helpers/doctorDashFormatters.ts`. Shared
  types (`PendingAppt`, `SetupStep`, `SetupProgress`, `QuickAction`, and one `<Component>Props`
  interface per extracted piece) moved to `src/types/doctorDash/index.ts`.
- **File move + import update**: `DoctorDash.tsx` moved from `pages/dashboard/DoctorDash.tsx` to
  `pages/dashboard/doctorDash/DoctorDash.tsx` (same precedent as #27/#41/#42). Verified no other
  file imported it directly besides `Dashboard.tsx` (grepped broadly, since this component also
  takes a `hideHeader` prop suggesting possible embedding elsewhere — turned out not to be, but
  worth checking rather than assuming from the prop name alone). Sibling dashboard files
  (`DateFilterTabs`, `CustomDateRangePicker`, `DashboardFooter`) and the shared `Sk` skeleton
  (`pages/dashboard/components/Skeleton.tsx`, entry #42) were left in place and referenced via
  updated relative paths — not moved, since they're shared across all three role-dashboards.
- **Zero behavior change**: pure move-and-wire-via-props, same as #41/#42 — no hook, query,
  `useMemo`, or handler logic touched. Verified with `eslint` + `tsc -b` after the split.
- **Reusable rule:** the same as #41 — this is now a three-times-repeated pattern (Admin,
  Receptionist, Doctor all split the same way), which is itself worth noting: once a structural
  convention has been applied to 3 sibling screens in the same feature area, a 4th similar screen
  (if one exists) should default to the same structure without needing to be asked, since the
  precedent is now well-established, not a one-off judgment call.

### 45. Incremental `tsc -b` silently missed 23 real errors across the new dashboard split files
- **Symptom:** every `tsc -b` run during the Admin/Receptionist/Doctor dashboard folder-split work
  (entries #41/#42/#44) reported exit code 0 — but a forced full rebuild (`tsc -b --force`,
  bypassing the incremental `.tsbuildinfo` cache) found **23** real `TS6133` errors: `import React
  from "react";` left in nearly every newly-extracted component file, unused because this project's
  `tsconfig.app.json` sets `"jsx": "react-jsx"` (the modern JSX transform, which doesn't need the
  `React` identifier in scope) combined with `"noUnusedLocals": true`.
- **Root cause:** TypeScript's incremental build (`--build` mode) trusts its `.tsbuildinfo` cache
  per-project-reference and can under some conditions skip re-diagnosing files it believes are
  already checked and unchanged relative to the cache — in this session, editing many new files in
  rapid succession across several background `tsc -b` invocations apparently left stale state that
  reported success without fully re-diagnosing every new file. This was not caught by `eslint`
  either, since the project's ESLint config doesn't have a rule flagging unused default imports in
  this exact shape.
- **Fix:** removed the unused `import React from "react";` line from all 23 files (kept it in the
  handful of files that actually use `React.useState`/`React.useMemo`/etc., e.g. the main
  `DoctorDash.tsx`/`AdminDash.tsx` composition files). Verified with `tsc -b --force` (not just
  `tsc -b`) afterward.
- **Reusable rule:** after a long run of many back-to-back background `tsc -b` checks in the same
  session (especially across dozens of new files created in quick succession), don't fully trust an
  exit-0 incremental result as the final word — run one `tsc -b --force` (or equivalent full
  re-check) before calling a multi-file structural change done, since incremental caching can mask
  real errors that a fresh full check catches immediately. This is distinct from the normal
  per-file-checkpoint workflow (still valuable for fast feedback during editing) — it's specifically
  a final-verification-before-done step for large batches of new files.

### 46. New Appointment booking flow (`/app/appointment/new`) — high-risk page, styling/a11y-only pass
- **Symptom:** the same "ad-hoc dark palette instead of tokens" pattern found on every prior page
  (raw `bg-white`/`text-slate-N`/`border-slate-N` paired with hand-picked `dark:` hex like
  `#0f1728`/`#111726`/`#273244`/`#38445a`) was present across all 28 files of the New Appointment
  flow (`NewAppointment.tsx`, 1,685 lines, + `new-appointment/` folder, 5,389 lines) — the largest
  and highest-risk surface tackled this session, since it's live scheduling + Razorpay payment
  logic. Additionally, the interactive slot/token grid buttons and a hand-rolled symptom-search
  combobox had no ARIA at all (no `role`, `aria-pressed`/`aria-selected`, or `aria-label` beyond a
  bare `title` attribute in one case).
- **Root cause:** same as every prior entry — dark mode was implemented ad-hoc per-component before
  the `bg-surface`/`text-text`/`text-text-muted`/`text-text-subtle`/`border-line` token convention
  existed on this page, rather than being migrated when the tokens were introduced.
- **Fix:** mechanical token substitution (same mapping as entries #1-#39) across all 28 files,
  scoped strictly to `className`/JSX markup — **zero logic changes**, enforced by explicitly
  fencing off `hooks/useAppointmentServicePayment.ts` (Razorpay/payment) and
  `hooks/usePatientSelection.ts` (lock/debounce) as no-touch-logic zones for the whole pass (both
  were read and confirmed to render no JSX at all, so nothing needed touching there). Added ARIA
  additively: `aria-pressed`/`aria-label` on the slot-grid and token-grid selection buttons,
  `role="tablist"`/`role="tab"`/`aria-selected` on the shift-selector pills, and a full
  `role="combobox"` + `role="listbox"`/`"option"` treatment (matching the existing
  `PatientSelectionSection.tsx` pattern) on the previously-unmarked symptom-search dropdown in
  `SymptomsSection.tsx`. Icon-only buttons that only had a `title` attribute got a matching
  `aria-label` added (title alone isn't reliably announced by screen readers).
- **Key refinement to the general "add ARIA to all custom dropdowns" playbook rule:** of the 4
  dropdown-like widgets in this flow, only 2 (`PatientSelectionSection.tsx`'s patient search and
  `SymptomsSection.tsx`'s symptom search) are truly hand-rolled comboboxes needing manual ARIA.
  `DoctorSelectionSection.tsx` (built on the shared `AutocompleteField`, itself a HeroUI
  Autocomplete wrapper) and `ServiceSelectionSection.tsx` (HeroUI's native `<Select>`/`<SelectItem>`)
  already carry complete internal ARIA from the library — adding manual `role="listbox"`/`"option"`
  on top would be redundant/conflicting, not additive. Always check what a dropdown is built on
  before assuming it needs manual ARIA.
- **Verified:** `eslint` after every file/section edit (0 errors throughout; only 5 pre-existing,
  unrelated warnings in `useAppointmentServicePayment.ts`/`useAppointmentSymptoms.ts` untouched by
  this pass), `tsc -b --force` (full rebuild, per entry #45's lesson) clean, `npm run build` clean
  (the only build warnings — 2 CSS-optimizer notices about `bg-slate-50/70` and `hover:bg-gray-50`
  — are pre-existing and appear in 40+ other, untouched files across the codebase, confirmed via
  grep before ruling them out as unrelated to this pass).
- **Reusable rule:** for any high-risk page (live payment, scheduling, or similar), explicitly name
  the specific hook/logic files that must not be touched *before* starting a bulk pass, and verify
  each is either pure logic (no JSX return) or markup-only before editing — don't rely on "styling
  only" as an unstated intention once the blast radius includes payment/lock logic. Read
  logic-fenced hooks fully once, read-only, to confirm they render nothing, rather than assuming
  from the filename.

### 47. Slot-grid buttons: overlapping/garbled text from missing `overflow-hidden` on narrow grid cells
- **Symptom:** on the New Appointment page's time-slot grid (`AppointmentSlotSection.tsx`), slot
  button labels like "9:30 AM – 10:00 AM – 10:30…" visually overlapped into neighboring grid cells,
  reading as garbled/doubled text, most visible at narrower panel widths (e.g. the two-column
  desktop layout where the slot panel is the right-hand column).
- **Root cause:** the slot button's time-range text used `whitespace-nowrap` with no `overflow`
  control and no `truncate`. When the `lg:grid-cols-2 xl:grid-cols-3` grid produced columns
  narrower than the rendered text, the text didn't wrap or clip — it overflowed the button's box
  and visually painted over the adjacent cell's content, since buttons had no `min-w-0`/
  `overflow-hidden` to constrain it and the grid container itself had no `min-w-0` to stop it from
  being pushed wider than its parent.
- **Fix:** added `min-w-0 w-full overflow-hidden` to the slot button, `w-full truncate` to both
  inner text `div`s (time range + status line), and `min-w-0` to the grid container itself so grid
  tracks can shrink below their content's intrinsic width instead of forcing overflow.
- **Also (same page, user-requested declutter):** the "shift" selector (e.g. "9:00 AM – 1:00 PM" /
  "2:00 PM – 6:00 PM") was a `flex-wrap` row of pill buttons, which read as unnecessary visual
  clutter above the slot grid, especially with only 2 shifts. Converted it to a single compact
  HeroUI `<Select>` dropdown (`size="sm"`, `w-[220px]` on `sm+`, full-width on mobile) — same
  `handleShiftTabClick` handler wired via `onSelectionChange`, zero logic change. Per entry #46's
  refinement, HeroUI `<Select>` needs no manual ARIA roles.
- **Reusable rule:** any button/cell in a CSS grid that renders variable-length text with
  `whitespace-nowrap` must also get `min-w-0` (or `overflow-hidden`) on itself **and** `min-w-0` on
  the grid container — a grid track's default `min-width: auto` lets content force the column
  wider than its fair share, and nowrap text with no overflow control then paints outside its own
  box instead of clipping. This is a distinct bug shape from the earlier "missing `dark:` pairing"
  color-trap entries — it's a layout/overflow bug, not a token bug, and won't show up in a code
  review that only checks color tokens; it has to be caught by eye in the rendered UI (or by
  visually testing at the actual container width the component ships at, not just resizing the
  full browser window).

### 48. New Appointment: `NewAppointment.tsx` moved inside its own `new-appointment/` folder
- **Symptom:** the New Appointment feature already had a `pages/appointment/new-appointment/`
  folder with its own `components/`, `helpers/`, `hooks/`, and `types.ts` — but the main view file,
  `NewAppointment.tsx` (plus its thin `NewAppointmentWrapper.tsx`), stayed *outside* that folder at
  `pages/appointment/NewAppointment.tsx`, inconsistent with the dashboard folder-split precedent
  (entries #41/#42/#44) where the main view file (`DoctorDash.tsx` etc.) moved *inside* its own
  `<viewName>/` folder alongside `components/`/`helpers/`.
- **Root cause:** two different, both-legitimate folder patterns exist in this codebase —
  (a) the `AppointmentListView.tsx`/`Appointment.tsx` pattern, where `<View>.tsx` stays flat in
  `pages/<feature>/` and only components/helpers get a `components/<view-name>/` subfolder
  (`UI_CONVENTIONS.md` §1's worked example), and (b) the dashboard pattern, where the whole feature
  — main file included — moves into its own subfolder. New Appointment had already committed to
  pattern (b) for its supporting files (its own `hooks/` folder in particular exists because
  `pages/appointment/hooks/useAppointmentDateRange.ts` — the list-view's date-range hook — and
  `new-appointment/hooks/useAppointmentDateRange.ts` — the booking-flow's calendar hook — are
  **completely different hooks that happen to share a name**; flattening hooks up to the shared
  `pages/appointment/hooks/` folder the way pattern (a) does would silently collide the two). Since
  the supporting files already needed pattern (b) to avoid that collision, the main file being left
  out of the folder was the one remaining inconsistency, not a case for flattening everything else
  up to match pattern (a).
- **Fix:** `git mv NewAppointment.tsx` and `NewAppointmentWrapper.tsx` into `new-appointment/`,
  updated the moved file's relative imports for the one level of depth change (`./new-appointment/components/…` → `./components/…`, `../../redux/api/…` → `../../../redux/api/…`, `./AllPlains` →
  `../AllPlains`, etc.), updated the single external reference (`src/routes/routes.ts`'s
  `NewAppointmentWrapper` import), and removed a stale path comment in the unrelated
  `PatientNewAppointment.tsx` that referenced the old location. `Reschedule.tsx`, which also
  imports several `new-appointment/components/*` and `new-appointment/helpers/*` files, needed
  **no changes** — it lives at the same folder depth as `new-appointment/` itself, so those import
  paths were never affected by moving the page file that happens to live inside that folder.
  Verified with `eslint` (clean) and `tsc -b --force` (clean, exit 0).
- **Reusable rule:** before flattening a feature's `components/`/`helpers/`/`hooks/` up into a
  shared parent folder to match the "flat `<View>.tsx` + `components/<view-name>/`" convention,
  check for filename collisions against what's already in the parent's shared folders — a same-named
  hook/helper serving a different purpose in the sibling flat structure is a sign the *nested*
  folder pattern is actually the correct (collision-safe) choice here, and the fix is to make the
  main view file consistent with its own folder, not to un-nest everything to match the other
  pattern.

### 49. New Appointment: 16 inline `Props` types across 12 components moved to `src/types/appointment/`
- **Symptom:** every component in `new-appointment/components/` declared its own `type
  XxxProps = { ... }` (plus a few small satellite types — `CalendarCell`/`CalendarMonthSection`,
  `ShiftUiData`, `PaymentOption`, `CreatedPatient`) directly above the component, in the component
  file itself — violating the FE `CLAUDE.md` hard rule "types go in `src/types/<domain>/`, not
  inline in components."
- **Root cause:** these components were all written together in one pass earlier without pausing
  to route their prop types through `src/types/appointment/`, unlike e.g. `AppointmentListView.tsx`
  (`src/types/appointment/list.ts`) or the toolbar components (`src/types/appointment/toolbar.ts`),
  which already followed the rule.
- **Fix:** created `src/types/appointment/newAppointment.ts` holding all 16 extracted types, and
  extended the existing barrel (`src/types/appointment/index.ts` gained `export * from
  "./newAppointment"`) rather than starting a new barrel — same approach as every other domain's
  `*Api.ts` type-extraction note in `CLAUDE.md`. Each component now does
  `import type { XxxProps } from "../../../../types/appointment"`. The feature-local
  `new-appointment/types.ts` (`Slot`/`TimeSlot`/`TokenSlot`/`DayRange`/`NewAppointmentForm`/etc.)
  was deliberately left where it is — it's a proper standalone file already, not "inline in a
  component," and `UI_CONVENTIONS.md` §1 explicitly allows a feature-local `types.ts` for types
  that aren't shared outside the feature; `newAppointment.ts` imports from it rather than
  duplicating it.
- **Caught during verification, not before:** one component (`AppointmentDateSection.tsx`) used
  `DayRange` directly in its body (`setDayRange(n as DayRange)`), not just inside its now-extracted
  Props type — removing the type import as part of the mechanical extraction silently broke that
  one usage, only caught by `tsc -b --force` (`TS2304: Cannot find name 'DayRange'`), not by
  `eslint` (unused-import lint only catches imports that are never referenced anywhere, and here
  the import had been removed, not left unused). Re-added the targeted `import type { DayRange }
  from "../types"` alongside the new Props import once found.
- **Reusable rule:** when extracting a component's inline `Props` type to a shared types file,
  grep the component body for every type name that appeared *inside* the old inline type (not just
  the type's own name) before deleting the import — a type used only in the Props shape and a type
  also used for an inline cast/annotation elsewhere in the same file look identical at a glance,
  and only the second kind needs to stay imported locally. `tsc -b` catches it, but only if you
  run it — don't treat "eslint is clean" as sufficient after a type-extraction pass, since a
  missing type-only import doesn't trigger `no-unused-vars`.

### 50. Reschedule page: back nav, token pass, and a "don't force-reuse" call
- **Symptom:** `Reschedule.tsx` (1,592 lines) already reused several New Appointment pieces
  (`AppointmentDateSection`, `AppointmentSlotSection`, `dateTimeHelpers`/`appointmentSummaryHelpers`
  functions, shared `Slot`/`TimeSlot`/`TokenSlot`/`DayRange` types) but had its own hand-rolled
  breadcrumb (no back-button, plain `<nav>` + `Link`s) instead of the `PageBackNav` shared
  component now used on New Appointment (entry from the prior session turn) and Add User, and still
  had the same raw `bg-white`/`text-slate-N`/`border-slate-N` + `dark:` hex pattern as every other
  page before its remediation pass.
- **Fix:** swapped the plain breadcrumb `<nav>` for `PageBackNav`, with `backTo`/first-crumb
  pointing to `/appointment/${id}` (falling back to `/appointment` if `id` is empty) so back
  navigation returns to the specific appointment being rescheduled, not a generic list — same
  per-caller-aware pattern `PageBackNav`'s own doc comment describes. Removed the now-unused
  `Link`/`FiChevronRight`-breadcrumb-only import surface (`FiChevronRight` itself stayed, still
  used by the submit button's arrow icon). Ran the same mechanical token substitution as every
  prior page this session (`bg-white`→`bg-surface`, `text-slate-N`/`dark:text-slate-M`→
  `text-text`/`text-text-muted`/`text-text-subtle` by the established N-threshold mapping,
  `border-slate-N dark:border-[#hex]`→`border-line`, `divide-slate-100 dark:divide-[#hex]`→
  `divide-line`). All 6 `<button>`s already had visible text labels — no icon-only a11y gaps to
  fix here, unlike some earlier pages.
- **Deliberately not done — evaluated and rejected:** the Reschedule right-rail summary panel
  looks superficially like `AppointmentSummaryPanel` (same card shell, similar patient/doctor rows)
  but actually renders reschedule-specific content with no analog in the New Appointment flow — a
  current→new date/time comparison with strikethrough-old/highlighted-new rows, a symptoms-chips
  block, and an appointment-status row. Forcing it onto the shared `AppointmentSummaryPanel`
  component would mean adding several reschedule-only optional props to a component whose only
  other consumer (New Appointment) would never pass them — the opposite direction from the "wait
  for a second real consumer" trigger noted in entry #42 above (that one promotes a component once
  two screens genuinely need the *same* shape; this one is two screens that only look alike).
  Two visually-similar-but-semantically-different panels are not the same component. Left it as
  `Reschedule.tsx`'s own markup, just with the same token substitution pass applied.
- **Reusable rule:** "reuse the shared component" doesn't mean "make every superficially similar
  block use the same component" — check whether the *props*, not just the visual shell, would
  actually be shared before merging two pieces of UI. A shared date/slot-picker (genuinely
  identical fields and behavior across both pages) is a good reuse target; a shared summary panel
  (different domain data shown, no field overlap beyond "patient name" and "doctor name") is not,
  even when it sits in the same visual position on the page.

### 51. Reschedule: split out duplicated helpers/types, deduped the genuine duplicates
- **Symptom:** `Reschedule.tsx` (1,592 lines) already imported several `new-appointment/helpers`
  functions under `shared*`-prefixed aliases (`sharedFormatDurationLabel`, `sharedPad2`,
  `sharedFormatTimeTo12Hour`), but *also* redefined its own local, inline copies of
  `fmtDateYMDslash`/`toApiDate`/`extractTimeLabel`/`calcDurationMinutes`/`formatTimeTo12Hour`/
  `pad2` (some byte-identical to the shared version, some a strict subset of it), plus inline
  `SlotStatus`/`TimeSlot`/`TokenSlot`/`Slot`/`RescheduleLocationState`/`FormValues`/`DayRange`
  types and several standalone display/date helpers (`initialsFromName`, `getDisplayText`,
  `normalizeSymptoms`, `isoFromYMD`, etc.) — all declared inline in the component file, violating
  the same `CLAUDE.md` "types go in `src/types/<domain>/`" rule as entry #49, plus genuinely
  duplicating logic that already existed elsewhere.
- **Fix — three different treatments for three different kinds of duplication:**
  1. **True duplicates** (`fmtDateYMDslash`/`toApiDate`, `extractTimeLabel`, `calcDurationMinutes`,
     `formatTimeTo12Hour`, `pad2` — identical or a strict subset of the shared
     `new-appointment/helpers/dateTimeHelpers.ts`/`appointmentSummaryHelpers.ts` versions): deleted
     the local copies entirely, imported the shared ones directly (dropped the `shared*` aliases
     since there was no longer a naming conflict to alias around).
  2. **Genuine divergence, not duplication** (`Slot`/`TimeSlot`/`TokenSlot`, `normalizeSlotsFromApi`,
     `groupSlotsIntoMultipleShifts`): Reschedule's versions carry extra fields
     (`appointmentId`/`appointmentStatus`/`patientId`/`source`/`shift1`/`shift2`) the New
     Appointment flow has no use for, needed so the reschedule form can eventually recognize "this
     slot is the appointment's own current booking" (there's commented-out logic for exactly this).
     `groupSlotsIntoMultipleShifts` also has an extra `source === "break"` check the shared version
     lacks. Kept these separate — moved to `src/types/appointment/reschedule.ts` and
     `src/pages/appointment/helpers/rescheduleHelpers.ts` respectively, not merged into the New
     Appointment versions. Same judgment call as entry #46's `useAppointmentDateRange` collision.
  3. **Reschedule-only logic with no shared equivalent at all** (`fmtTime`,
     `buildAppointmentDateTimeIso`, the reason-field constants/helpers, the day-range calendar math,
     the display formatters `initialsFromName`/`getDisplayText`/`getDisplayDate`/`getYearsText`/
     `getAgeText`/`normalizeSymptoms`, `isRescheduleState`): moved to `rescheduleHelpers.ts` as-is,
     per the folder-structure convention (`pages/<feature>/helpers/`), not left inline in the
     1,592-line component file.
  Net effect: `Reschedule.tsx` dropped from 1,592 → 1,132 lines, with the remainder split into a
  50-line types file and a 373-line helpers file.
- **Caught during the split, not before:** three prop-pass call sites
  (`formatDurationLabel={sharedFormatDurationLabel}`, `formatTimeTo12Hour={sharedFormatTimeTo12Hour}`,
  `pad2={sharedPad2}` inside the `<AppointmentSlotSection>` JSX) still referenced the *old* aliased
  import names after the aliases were dropped from the import statement — same failure shape as
  entry #49's `DayRange` miss: a plain `grep` for the type/function's own name before deleting an
  import isn't enough when the name is also embedded inside a JSX prop value, not just a standalone
  expression. `eslint`'s `no-unused-vars` didn't catch it either (the *new* unaliased names were
  correctly used elsewhere, so nothing looked unused — the bug was a dangling reference to a name
  that no longer existed, which only `tsc -b` surfaces).
- **Verified:** `eslint` clean, `tsc -b --force` full rebuild clean (exit 0).
- **Reusable rule:** before deduplicating a "looks the same" helper/type against a shared one,
  diff them line-by-line, not just by name — a same-named function can be a true duplicate (delete
  and reuse), a strict superset/subset (safe to substitute with the more capable one), or a genuine
  divergence carrying extra fields for a real reason (keep separate, just relocate out of the
  component file). Treating all three cases the same way — either blind reuse or blind "leave it
  inline forever" — is wrong in different directions for each.

### 52. Appointment Details: back nav, page-level `bg-[#hex]` token, full dark-mode pass across 8 sibling components, 8 more inline types extracted
- **Symptom:** `AppointmentDetails.tsx` (2,625 lines) itself was almost entirely clean already —
  every color-trap match was concentrated in one place: the page-level wrapper
  (`bg-[#f8fbfd] dark:bg-[#0b1321]` — a raw hex pair that happens to exactly match the
  `--color-background` token's light/dark values) and a hand-rolled breadcrumb with no back
  button and a self-referential "Appointment Details" link pointing at the current page (`/appointment/${id}`,
  the page you're already on). The real remediation surface was the 8 sibling components this page
  composes (`AppointmentSummaryCard.tsx`, `AppointmentDetailsTabs.tsx`, `AppointmentDetailsModals.tsx`,
  `AppointmentDetailsSkeletons.tsx`, `AppointmentServicesCard.tsx`, `ConsentFormSection.tsx`,
  `ReferFormSection.tsx`, `AppointmentVitalsSection.tsx`), which together had 215 raw
  `bg-white`/`text-slate-N`/`dark:bg-[#hex]`/`dark:text-[#hex]` matches and 8 more inline `Props`
  types (same shape as entry #49).
- **Fix:**
  - Swapped the breadcrumb for `PageBackNav` (same shared component as entries #46/#50/#51) —
    `backTo="/appointment"`, last crumb non-link (fixing the self-referential link as a side effect,
    not just a style change).
  - `bg-[#f8fbfd] dark:bg-[#0b1321]` → `bg-background` (verified exact hex match against
    `--color-background` in both `:root` and `.dark` blocks in `index.css` before substituting —
    this is the page-background token, distinct from `bg-surface` which is for cards).
  - Ran the same mechanical token substitution (established since entry #1) across all 8 sibling
    files — verified via per-file diff review before running `eslint`/`tsc`, same as every prior
    pass this session.
  - Found one genuine zero-dark-handling bug the mechanical pass doesn't catch (word-boundary
    regex deliberately skips `bg-white/NN` opacity variants): a modal footer bar in both
    `ConsentFormSection.tsx` and `ReferFormSection.tsx` used `border-[#CFEAE5] bg-white/95` with
    **no** `dark:` pair at all (not even redundant, just absent) — fixed to `border-line bg-surface/95`.
  - Extracted 8 more inline `Props` types (`AppointmentSummaryCardProps`, `AppointmentVitalsSectionProps`,
    `AppointmentServicesCardProps`, `ConsentFormSectionProps`, `ReferFormSectionProps`,
    `AppointmentDetailsTabsProps`, `AppointmentFlowStepperProps`, `AppointmentDetailsModalsProps`)
    into `src/types/appointment/appointmentDetails.ts`, extending the same barrel as entries #49-51.
  - Checked every `<button>`/HeroUI `<Button>` for icon-only-without-`aria-label` gaps (playbook
    item 3) — none found; this feature already had good `aria-label` discipline on its true
    icon-only buttons (dismiss/close/view-profile buttons all already labeled).
- **Verified:** `eslint` clean across all 10 touched files, `tsc -b --force` full rebuild clean
  (exit 0).
- **Reusable rule:** when a page's own top-level file looks nearly clean, don't stop there —
  check what it *composes*. A thin, already-modularized page file can hide the entire remediation
  surface in its sibling `components/` files; grep the whole feature folder's color-trap counts
  before concluding a page is "already fine." Also: the `bg-white/NN` opacity-variant exclusion in
  the standard substitution regex is deliberate (don't touch intentional translucency), but that
  same exclusion means a *fully unhandled* raw color using an opacity suffix (no `dark:` pair at
  all, unlike the usual redundant-pair case) slips through undetected — worth a manual grep for
  `bg-white/\d+\b(?!.*dark:)` specifically after the main substitution pass on any new page.

### 53. Appointment Actions button row: raw Tailwind palette instead of brand/semantic tokens, one broken hover class
- **Symptom:** the "Appointment Actions" button row (Confirm / Mark No-Show / Reschedule / Cancel /
  Mark as Completed / Patient Arrived / Add Service, in `AppointmentSummaryCard.tsx`) used raw
  Tailwind palette colors instead of this project's brand/semantic tokens, in three different ways:
  1. `bg-teal-700`/`hover:bg-teal-800` on Confirm, Patient Arrived, and Add Service — Tailwind's
     stock `teal-700` (`#0f766e`) is visually close to but **not** the same color as the brand's
     `--color-primary` (`#0a6c74`), so these buttons were a slightly-off, inconsistent teal instead
     of the actual brand primary.
  2. `bg-green-700`/`shadow-green-900/15` on Mark as Completed, and raw `border-amber-300
     bg-amber-50 text-amber-700` (+ separate dark: overrides) on Mark No-Show — using generic
     Tailwind green/amber instead of this project's semantic `--color-success`/`--color-warning`
     tokens.
  3. **A genuinely broken class** on Reschedule: `hover:bg-background-secondary-50` — there is no
     `-50` shade of the custom `background-secondary` color (it's a single solid custom color, not
     a Tailwind shade scale, confirmed by how `AppButton.tsx`'s own `outlined` variant uses plain
     `bg-background-secondary` with no suffix) — so this hover state silently did nothing. Also
     `text-black` instead of `text-primary` on the same button.
- **Fix:** `bg-teal-700`/`hover:bg-teal-800` → `bg-primary`/`hover:bg-primary-hover` (3 buttons);
  `bg-green-700` → `bg-success`; Mark No-Show's amber → `border-warning bg-warning/10` for the
  background/border **but kept a dark, readable `text-amber-800`/`dark:text-amber-300` for the
  text** rather than switching to a literal `text-warning` — `--color-warning` is `#ffbd11`, a
  bright yellow-gold that fails contrast as a text color against a light background (this is a
  background/accent token, not a text token, even though it's semantically "the warning color").
  Cancel's `bg-danger` and its `shadow-rose-900/15`/`shadow-danger/15` were already the *correct*
  token (that pink-red **is** the actual `--color-danger` value, not a mismatch — verified against
  `index.css` before touching it) — only aligned its shadow color name to match. Fixed
  `hover:bg-background-secondary-50` → `hover:bg-background-secondary` and `text-black` →
  `text-primary` on Reschedule.
- **Verified:** `eslint` clean, `tsc -b --force` full rebuild clean (exit 0).
- **Reusable rule:** "looks like it's using the theme" isn't the same as "is using the theme" —
  `bg-teal-700` and `bg-primary` render almost identically at a glance but are different color
  values; the only way to catch this is to compare the literal hex a raw Tailwind class resolves to
  against the actual token value in `index.css`, not just eyeball the rendered color. Separately:
  when substituting a semantic token (`warning`/`danger`/`success`) into an existing tonal/outline
  button, check whether the raw token color is bright/light enough that using it directly as *text*
  color would fail contrast — background/border usage of a semantic token doesn't imply its text
  usage is automatically safe.

### 54. Add Patient (`/app/patient/new`): first non-appointment page in this pass — same rules apply cleanly
- **Symptom:** `AddPatient.tsx` (1,492 lines) + its 3 sibling components (`PatientFormSections.tsx`,
  `PatientFormSidebar.tsx`, `FamilyRelationSection.tsx`) had the same three-part pattern as every
  appointment-feature page fixed this session: a hand-rolled header (`<h1>` + a plain `<button
  onClick={() => navigate("/patients")}>` styled as a breadcrumb link, not an actual back-button
  affordance, no back arrow icon at all), raw `bg-white`/`text-slate-N`/`dark:text-white` color
  traps across all 4 files, and 8 inline `Props`/domain types across the same 4 files.
- **Fix:** same treatment as entries #46/#49-52, confirming the pattern generalizes past the
  appointment feature:
  - Swapped the header for `PageBackNav` (`backTo="/patients"`, matching the existing "Patients"
    label/route).
  - Ran the standard token substitution across all 4 files.
  - Extracted `GenderOpt`, `AddPatientFormValues` (renamed from `FormValues` — too generic a name to
    export from a shared barrel — imported back in as `AddPatientFormValues as FormValues` to avoid
    touching every call site), `VoicePatientForm`, `PatientFormSectionsProps`,
    `PatientFormSidebarProps`, `DuplicateFamilyCandidate`, `DuplicateFamilyResult`,
    `FamilyRelationSectionRef`, `FamilyRelationSectionProps<T>` into a new
    `src/types/patient/addPatient.ts`, extending `src/types/patient/index.ts`'s existing barrel.
  - **Deliberately did not extract** `FamilyRelationship` (`(typeof RELATIONSHIP_OPTIONS)[number]["value"]`)
    — it's derived via `typeof` from a runtime const (`RELATIONSHIP_OPTIONS`) that lives in the
    component. Moving the type without the const would force either duplicating the options list in
    two places or moving actual runtime data into a "types" file. Left it co-located with its
    source of truth, documented inline why.
  - `FamilyRelationSectionRef` is re-exported from `FamilyRelationSection.tsx` itself (`export type
    { FamilyRelationSectionRef } from "../../../types/patient"`-shaped re-export) so `AddPatient.tsx`'s
    existing `import type { FamilyRelationSectionRef } from "./components/FamilyRelationSection"`
    didn't need to change — avoids touching a working import path just to satisfy where the type is
    *defined*.
- **Verified:** `eslint` clean across all 4 files, `tsc -b --force` full rebuild clean (exit 0).
- **Reusable rule (the meta one):** this page's issues were identical in *kind* to five appointment
  pages already fixed, on a feature this session hadn't touched before. That's the signal this
  playbook is meant to produce — the fix pattern generalizes across features, not just within one.
  When starting a new, previously-untouched feature folder, run the same three checks immediately
  (header/back-nav, color-trap grep, inline-type grep) rather than re-deriving what to look for.
  Also added item 16 to `UI_PLAYBOOK.md`'s "things that broke" list and a new "Page header / back
  navigation" section to `PAGE_AUDIT_CHECKLIST.md`, since `PageBackNav` adoption has now recurred
  enough times (entries #46, #50, #51, #52, #54) to be a standing checklist item, not something
  re-explained per page.

### 55. Shared form primitives had a near-invisible dark-mode text bug — app-wide, not page-specific
- **Symptom:** while codifying `InputField.tsx` as the canonical form-input reference (per the
  user's request to standardize input-box styling going forward), found its dark-mode text color
  was `dark:!text-slate-100`. `TextareaField.tsx` and `CitySelector.tsx` had the identical override.
- **Root cause:** exactly the item-1 trap (`.dark` inverts the whole slate palette) but backwards
  from the usual case — instead of a *missing* dark override on a bare class, this is an *explicit*
  dark override on a colour that itself auto-inverts. Under `.dark`, `--color-slate-100` is
  `#151c2d` (a near-black navy), not a light tone — so `dark:!text-slate-100` set typed input text
  to near-black on these components' near-black input backgrounds (`dark:!bg-[#0f1728]`). Since
  these three components back nearly every text field, textarea, and city/state search across the
  entire app, this wasn't a one-page bug — it affected every form built on the shared primitives.
- **Fix:** replaced `!text-slate-900 ... dark:!text-slate-100` with `!text-text` (the token, which
  is designed to invert correctly by construction rather than requiring a hand-picked dark step)
  in `InputField.tsx`, `TextareaField.tsx`, and `CitySelector.tsx` (both its input classNames and
  its dropdown `popoverContent`, which had the same bug: `dark:text-slate-100` on the city-search
  results list). Also swapped `CitySelector.tsx`'s `placeholder:text-slate-400` (no dark pairing)
  to `placeholder:text-text-muted`, and its popover's `border-slate-200`/`bg-white` to
  `border-line`/`bg-surface`.
- **Not fixed — flagged for follow-up, not swept in this pass:** the same `dark:!text-slate-100`
  pattern exists in ~20 more files that hand-roll their own HeroUI `Input`/`Autocomplete` styling
  instead of using the shared primitives — full list in `UI_PLAYBOOK.md` item 17. These weren't
  touched here because each is a page this session hasn't individually reviewed yet (auth flow,
  onboarding flow, several profile/settings pages) — fixing them blind, in bulk, without seeing
  each screen risks the same "diverged for a real reason, don't force-merge" mistake avoided in
  entries #46/#51. Next pass through any of those screens should check for this specific pattern
  first, before anything else on the page.
- **Verified:** `eslint` clean on all 3 touched files, `tsc -b --force` full rebuild clean (exit 0).
- **Reusable rule:** an explicit `dark:` override is not automatically "handling dark mode
  correctly" just because it *looks* like a deliberate dark-specific choice — if the color used
  inside that override is itself one of the auto-inverting palettes (slate, per item 1), the
  override can silently flip the intended effect. Before trusting any `dark:text-slate-N`/
  `dark:bg-slate-N`/`dark:border-slate-N`, resolve what that step actually renders to under `.dark`
  in `index.css`, the same check item 1 already prescribes — this entry is a concrete instance of
  that check catching a real, app-wide, high-severity bug, not a hypothetical one.

### 56. `InputLabel.tsx`, form placeholder color, and a correction to entry #55's `bg-gray-50` diagnosis
- **Symptom (real bug):** `InputLabel.tsx` — the shared label component every `InputField`/`SelectField`/
  form field renders through, app-wide — had `dark:text-slate-200` as its **only** color class (no
  light-mode color at all). `--color-slate-200` under `.dark` is `#273244`, a dark navy — nearly
  invisible against the dark page background. Every field label in every form in the app (New
  Patient screenshot showed it directly: "Full Name," "Gender," "Age" all rendering dim/low-contrast
  in dark mode) was affected. Separately, `InputField.tsx`/`TextareaField.tsx` used
  `placeholder:text-muted` — `--color-muted` (`#38445a` dark) sits right next to
  `--color-border-color` in both light and dark values, meaning it was clearly designed as a
  border/divider token, not a text color; using it for placeholder text produced very low-contrast
  placeholders in dark mode.
- **Fix:** `InputLabel.tsx`'s label → `text-text-muted` (proper light+dark aware token, replacing
  the dark-only broken override). `placeholder:text-muted` → `placeholder:text-text-muted` in both
  `InputField.tsx` and `TextareaField.tsx`. Also found and fixed one more instance of entry #55's
  exact bug shape in `AddPatient.tsx`'s custom address textarea (`text-text` immediately undone by
  a trailing `dark:text-slate-100`), and a `[&_[data-slot='label']]:!text-slate-900` +
  `dark:[&_[data-slot='label']]:!text-slate-200` pair (same broken-inversion shape, just wrapped in
  an arbitrary-selector) in both `AddPatient.tsx` and `PatientEdit.tsx` — replaced with a single
  `[&_[data-slot='label']]:!text-text`.
- **Correction to entry #55:** while investigating, verified (by reading `index.css` directly,
  not assuming) that `--color-gray-50` through `--color-gray-950` **are** redefined inside `.dark`
  in this codebase, with values identical to the matching `--color-slate-*` step — i.e. `gray` is a
  deliberate alias of `slate` here, not a non-inverting palette like `yellow`/`red`/`blue`/etc.
  (item 12). That means the earlier framing of `MainLayout.tsx`'s `bg-gray-50` as "a critical,
  app-wide invisible-shell bug" (in the conversation, not yet written to this log) was **overstated
  — it was already auto-inverting correctly**, same mechanism as slate (item 1). The `bg-gray-50` →
  `bg-background` swap made there is still a valid, harmless consistency improvement (using the
  explicit token beats relying on an implicit palette alias), just not the root cause it was
  described as. No log entry was made for that specific claim before this correction, so nothing
  else needs to be retracted — this note exists so the *next* investigation doesn't repeat the
  assumption.
- **Verified:** `eslint` clean on all touched files.
- **Reusable rule:** before declaring a color trap "critical" or "app-wide," verify the actual
  resolved value in `index.css` for *that specific* CSS custom property — don't extrapolate from a
  similarly-named palette's documented behavior (item 12 is about `yellow`/`red`/`blue`/etc., not
  every non-slate Tailwind color name; this codebase's `gray` turned out to be a slate alias, which
  a name-pattern-matching assumption would have missed). Separately: a token named `--color-muted`
  sitting at nearly the same hex value as `--color-border-color` in both themes is a strong signal
  it was designed for borders, not text — check what a token's value is *close to*, not just its
  name, before using it for an unrelated purpose like placeholder text.

### 57. Profile feature (`/app/profile` + 20+ sub-routes) — mechanical pass done, deep pass NOT complete (by design, not oversight)
- **Scope:** the Profile settings hub is 33 files / ~22,000 lines — an order of magnitude larger
  than any single screen fixed earlier this session. Given that, this entry is deliberately explicit
  about what was and wasn't done, rather than implying a full page-by-page pass like the
  appointment/patient features got.
- **Done, verified:**
  - `Profile.tsx` (the shell every sub-route renders inside via `<Outlet>`): full token pass, plus
    its 3 inline types (`Role`, `MenuKey`, `MenuItem`) extracted to the new
    `src/types/profile/profile.ts` + `index.ts` barrel (first files in this domain — no prior
    `src/types/profile/` existed).
  - Mechanical `bg-white`/`text-slate-N`/`border-slate-N`/redundant-`dark:` token substitution
    (the same proven script used on every page this session) run across all 33 files; 28 needed
    changes. Every diff spot-checked for safety before/after; `eslint` clean (0 new errors — only
    5 pre-existing warnings in files this pass didn't touch the logic of), `tsc -b --force` clean
    (exit 0).
  - Grepped the entire feature for entry #55/#56's "backwards inversion" bug shape
    (`dark:text-slate-100`/`-50`) — zero hits, so that specific severity-class bug does not recur
    here.
  - Checked for missing back-navigation: none of the settings-hub sub-pages need `PageBackNav` —
    they're persistent sidebar-nav destinations within `Profile.tsx` (same category as
    `/app/patients` needing none), not detail/create/edit pages reached from a list. The one
    genuine create/edit flow found (`EditServicePage.tsx`, reached from `ServicesPrice.tsx`)
    already has its own correctly-built icon back-button + `aria-label="Go back"`, appropriately
    scoped to the embedded-panel context rather than a full-page breadcrumb.
- **Explicitly NOT done in this pass — flagged, not silently skipped:** 24 of the 33 files declare
  inline `type`/`interface` Props or form-value shapes that should move to `src/types/profile/`
  per the same rule as entries #49-52 — extracting all 24 with the same care (checking each for
  direct-body usage beyond the Props shape, per entry #49's `DayRange` miss) is a multi-hour task
  on its own and wasn't attempted wholesale here to avoid the alternative failure mode: a rushed,
  under-verified sweep across unfamiliar files. Also not done: full manual per-file review for
  responsive/a11y issues beyond the color-token pass (icon-button `aria-label` coverage, folder-split
  candidates for oversized files, etc.) — `Overview.tsx` alone is 1,564 lines and hasn't had that
  level of review yet.
- **Reusable rule:** when a requested scope ("all inner sub-pages") is an order of magnitude larger
  than prior single-screen passes, do the safe, mechanical, verifiable-at-scale fixes first
  (token substitution, critical-bug grep) across everything, and explicitly enumerate what's left
  rather than either (a) claiming full parity with smaller single-page passes, or (b) refusing to
  touch anything until every file gets the full treatment. A large feature can get real, verified
  value in one pass without every file receiving the same depth of review.

### 58. Profile feature: full inline-type extraction across all 24 flagged files (closing out entry #57)
- **Symptom:** entry #57 flagged 24 of the profile feature's 33 files as having inline `type`/
  `interface` Props/domain declarations that hadn't been moved to `src/types/profile/` yet, and
  deliberately didn't attempt the extraction in that pass to avoid rushing it. This entry closes
  that out — all 24 files done, one at a time, each verified with `eslint` before moving to the next.
- **New types files created** (extending `src/types/profile/index.ts`, one file per source
  screen/pair, same granularity as the appointment/patient domains): `addClinicModal.ts`,
  `clinicAvailability.ts`, `clinicAvailabilityLeavesTab.ts`, `services.ts` (EditServicePage +
  UpdateServicePriceModal), `medicines.ts` (Medicines + AddMedicineModal), `clinicEdit.ts`,
  `clinicSettings.ts`, `leavesList.ts`, `mfaSettings.ts`, `updateServicesModal.ts`,
  `prescriptionPreference.ts`, `profileUpdateRequestModal.ts`, `noShowPolicySettings.ts`,
  `updateClinicModal.ts`, `subscriptionModal.ts`, `leaveEditors.ts` (LeavesInlineEditor +
  UpdateDateOverrideModal), `servicesPrice.ts`, `updateUpiModal.ts`, `overview.ts`,
  `quickPrintTemplates.ts`. `profile.ts` (already existed from entry #57) gained a new
  `ProfileOutletContext` type.
- **Genuine name collisions found and resolved with per-file-prefixed names** (same category as
  entry #51's `Slot`/`TimeSlot` handling): `ServiceForm` (EditServicePage vs
  UpdateServicePriceModal — different fields, kept as two distinct types, not merged),
  `Props`/`FormValues` (UpdateClinicModal vs LeavesInlineEditor vs UpdateDateOverrideModal — three
  unrelated shapes sharing generic names), `Break`/`AvailabilitySlot`/`DateTimeSlot`/
  `DateAvailabilityItem` (ClinicAvailability.tsx's real, in-use versions vs
  ClinicAvailabilityLeavesTab.tsx's — the latter turned out to be **dead code**, confirmed via a
  repo-wide grep showing `ClinicAvailabilityLeavesTab.tsx` is never imported anywhere; kept its
  types under a `LeavesTab`-prefixed name rather than deleting the file outright, since removing
  a whole component wasn't asked for).
- **A true duplicate found and reused instead of re-extracted**: `prescriptionTemplates.tsx`'s
  local `type DoctorPrescriptionType = "Digital" | "Manual"` was byte-identical to the already-
  exported `DoctorPrescriptionType` in `redux/api/prescriptionApi.ts` — deleted the local copy and
  imported the existing one instead of creating a third near-duplicate definition.
- **Two types deliberately left inline, not extracted, for the same reason as entry #52's
  `FamilyRelationship`**: `ClinicAvailability.tsx`'s `WeeklyEditorProps`/`WeeklyEditorSlot`/
  `WeeklyEditorDateAvailabilityItem`/`WeeklyEditorDateTimeSlot`/`DayRowProps` are all derived via
  `ComponentProps<typeof WeeklySlotInlineEditor>` — moving them would require importing the actual
  component into a types-only file. More importantly, `AvailabilitySlot["dayOfWeek"]` in that same
  file is typed as `WeeklyEditorSlot["dayOfWeek"]`, which resolves to `WeekDay` — a **module-private,
  non-exported** union type inside `pages/clinic/WeeklySlotInlineEditor.tsx`. Extracting
  `AvailabilitySlot` standalone would have silently widened that field to `string`, a real
  type-safety regression caught before it shipped, not after.
- **A real regression caught mid-pass, not by tooling**: after extracting `Break` out of
  `ClinicAvailability.tsx` (into `clinicAvailability.ts`) without re-exporting it from the
  component file, `UpdateClinicModal.tsx`'s `import type { AvailabilitySlot, Break,
  DateAvailabilityItem } from "./ClinicAvailability"` silently broke — `Break` was no longer
  exported from there. **`eslint` did not catch this** (a missing named export isn't a lint rule,
  it's a type-checker error) — it surfaced only when manually reasoning through what each file
  imported from where, and was confirmed via a targeted grep for every other consumer of that
  import path before assuming the fix was complete.
- **Verified:** `eslint` clean across every touched file (only the same 7 pre-existing warnings
  from entry #57 remain, none new), `tsc -b --force` full rebuild clean (exit 0).
- **Reusable rule:** when extracting a type `X` out of file `A` into a shared types module, and
  file `B` currently does `import type { X } from "./A"` (re-exporting via the barrel-like
  re-export pattern), grep the whole repo for every other file importing that name from the
  **old** location before considering the extraction done — moving a type's source of truth can
  silently break a sibling file's import path even when the type's own consumer (the file you're
  actively editing) still works fine, and this class of break is invisible to `eslint`, only
  `tsc` (or a manual grep) catches it.

## 59. Stat-card swipe strip left dead space to the right on 1100-1279px laptops
- **Screens:** Appointments (`pages/appointment/components/toolbar/StatCard.tsx`), Patients
  (`pages/patient/components/toolbar/StatCard.tsx`), Payment History
  (`pages/paymentHistory/components/toolbar/StatCard.tsx`).
- **Symptom:** on a 1440px laptop at 125% OS scaling (~1150px CSS width — below `xl`), the stat
  cards stopped roughly two-thirds across the page with a large empty gap to their right, while the
  table below spanned the full width.
- **Root cause:** the strip only becomes a full-width grid at `xl` (1280px). Below that it is a flex
  strip whose cards were `w-[Npx] shrink-0 ... sm:w-auto` — `sm:w-auto` sizes each card to its
  content, and with `flex: 0 0 auto` nothing grows, so a row that fits in the container simply
  leaves the leftover width unused. It only looks correct when the cards happen to overflow.
- **Fix:** replace the fixed width with `shrink-0 grow basis-[Npx] sm:basis-[Mpx]`. Cards share the
  full row whenever they fit (no dead space at any width below `xl`) and still overflow into the
  scrollable snap strip when they don't. `basis`/`grow` are inert once the container becomes a grid
  at `xl`, so the existing `xl:grid-cols-N` behaviour is untouched.
- **Verified:** `eslint` clean on all three files.
- **Reusable rule:** in a horizontally-scrollable strip, children must be `flex: 1 0 auto`
  (`grow shrink-0 basis-*`), never `flex: 0 0 auto` with a fixed/auto width — "grow to fill, never
  shrink, overflow when out of room" is the behaviour that reads correctly at *every* width, not
  just the ones where the content happens to overflow. Check the mid-range widths (1100-1279px,
  where a scaled laptop actually sits) before assuming an `xl:` grid covers desktop.

## 60. Vertically-scrolling slot grid hard-cut a row at rest, top or bottom
- **Screen:** New Appointment booking, time-slot picker (`pages/appointment/new-appointment/components/AppointmentSlotSection.tsx`).
- **Symptom:** the "Available Time Slots" grid scrolls inside a `min-h-0 flex-1 overflow-y-auto`
  box. Because ordinary scrolling can stop at *any* pixel offset, a row was frequently left
  half-visible at the top or bottom edge at rest — glyphs clipped mid-character — reading as a
  rendering bug rather than a scroll affordance.
- **Rejected fix:** a `mask-image`/gradient-overlay fade at the scroll edges. This only paints a
  fade *over* the existing hard clip — it doesn't change where the browser is allowed to stop
  scrolling, so a row was still visibly sliced underneath the fade. Confirmed insufficient by the
  user after implementing it; removed.
- **Actual fix:** CSS scroll-snap. `snap-y snap-mandatory` on the scroll container plus
  `snap-start` on every slot card. Every card in the same visual row shares the same top offset in
  the grid, so snapping to *any* card's top edge effectively snaps to that whole row's boundary —
  the browser can now only rest the scroll position where a full row starts, never mid-row.
- **Tooltip note:** a custom absolutely-positioned tooltip (`top-full`, below the card) was
  briefly swapped for the native `title` attribute to dodge it overlapping the row underneath in a
  dense grid, but reverted — the user wanted the richer styled popup kept. Left as-is (still
  positioned below); only the scroll-cut issue was in scope for the actual fix.
- **Verified:** `eslint` clean.
- **Reusable rule:** for a **vertically**-scrolling grid where a row must never be left half-cut
  at rest, don't reach for a fade/mask overlay — it only hides the clip cosmetically, it doesn't
  stop the browser from resting there. Use `snap-y snap-mandatory` on the container + `snap-start`
  on each item; items sharing a row's top offset makes this snap to row boundaries with zero JS or
  row-height math.

## 61. Widget band: one tall card stretched its neighbours / narrow-rail card broke in a wide column
- **Screen:** Reception dashboard overview band (`pages/dashboard/receptionistDash/ReceptionistDash.tsx`,
  `DonutOverviewCard`, `PendingPaymentsWidget`, `DoctorQueueWidget`, `AppointmentsTable`).
- **Symptom (two shapes):** (a) `DonutOverviewCard` — designed for a ~320px sidebar rail — was
  placed alone in a wide column and its donut/legend split to opposite edges with a hole in the
  middle; (b) once a list widget (Collect Payments) grew past ~4 rows, every card in its grid row
  stretched to match it, leaving blocks of empty space in the short cards.
- **Fix:** (a) cards designed for a narrow rail go into a multi-column band (`md:grid-cols-2
  xl:grid-cols-3`), never alone across a wide column; (b) the band grid gets `items-start` so cards
  take natural height, and every list widget caps its list (`max-h-56 overflow-y-auto
  [scrollbar-width:thin]`) so long content scrolls inside the card. Same cap applied to the
  dashboard appointments table (`max-h-[420px]` + `sticky top-0 bg-surface` header) instead of a
  silent `slice(0, 8)` row cutoff.
- **Reusable rule:** a dashboard widget row needs both halves of the height contract: `items-start`
  on the row (short content → natural height) and a `max-h` + inner scroll on each list widget
  (long content → fixed height). Never solve "card too tall" by truncating data with `slice()` —
  cap + scroll keeps everything reachable. And check a card's design width before moving it between
  rail and main column.

## 62. Anchored popover clipped off-screen when its trigger sat in the right-most column
- **Screen:** `components/shared/FeatureInfoTip.tsx`, triggered from the Doctor Queues widget header.
- **Symptom:** the info popover is `absolute left-0` (opens rightward); with the trigger in the
  right-most card of a band, the popover ran past the viewport edge and its text was clipped.
- **Fix:** added an optional `align?: "left" | "right"` prop (default `"left"` so all existing
  consumers are untouched — per entry #39's "check every consumer" rule); right-edge consumers pass
  `align="right"` to open leftward.
- **Reusable rule:** any absolutely-anchored popover/dropdown needs an alignment escape hatch, and
  every *placement* of it near the right viewport edge needs checking — the component being "fine"
  on one screen says nothing about its right-most placement on another. Extend the shared component
  with a defaulted prop; don't fork or inline-style around it.

## 63. "Right now" dashboards: decorative trend sparklines and two-value donuts are filler, not information
- **Screen:** Reception dashboard (`ReceptionStatCard.tsx`, removed "Payments Overview" donut,
  added `PendingPaymentsWidget`).
- **Symptom:** the reception stat row cloned the admin dashboard's cards, inheriting sparkline
  graphics that imply a time series the page doesn't have; a "Payments Overview" donut visualized
  exactly two numbers already shown in the stat tiles.
- **Fix:** role-specific `ReceptionStatCard` — same card bones (tokens, icon chip, sizes) so the
  app still reads as one system, but the sparkline slot is replaced by a live detail line
  ("Next: Token #2 · rad", "3 patients due"), an optional real progress bar (seen/total), and the
  whole tile is a `<button>` shortcut (scroll-to-section or navigate), disabled under the approval
  lock. The two-value donut became an actionable worklist (who owes, how much, tap to open).
- **Reusable rule:** trend graphics only where a real series exists — an operational "today" screen
  gets live micro-context instead. A chart of two values is decoration; replace it with the list of
  the actual items it summarizes. Differentiate role dashboards by *content* (what this role does
  next), not by repainting the same KPI row.

## 64. Client-side fallback silently masked a 500 from the dedicated stats endpoint
- **Screen:** Reception dashboard stats (`useGetReceptionOverviewQuery` + derived-from-list fallback).
- **Symptom:** appointment counts looked right but every API-only stat (₹ collected, ₹ pending,
  new patients) showed zero. No visible error anywhere — the RTK query was returning 500 and the
  `stats` memo quietly fell back to client-side derivation, which can count list rows but knows
  nothing about payments.
- **Root cause (BE side):** a Drizzle query that typechecked but failed at runtime — `Date` objects
  bound against a raw ``sql`MIN(...)` `` fragment have no column context for serialization
  (`ERR_INVALID_ARG_TYPE`); fixed by passing `.toISOString()` strings.
- **Reusable rule:** when a screen has a graceful API fallback, "derived numbers fine, API-only
  numbers all zero" **is** the error signature — check the network tab / backend logs before
  touching the UI. And `tsc` passing says nothing about a Drizzle query executing; raw SQL fragments
  need runtime verification, and `Date` params in raw fragments must be ISO strings.

## 65. Keyboard-navigation state existed but nothing rendered it — the whole feature was invisible
**Symptom.** In the prescription medicine picker, pressing ↑/↓ appeared to do nothing and Enter
added a seemingly arbitrary medicine.
**Root cause.** `PrescriptionWorkspace.tsx` held `const [highlight, setHighlight] = useState(0)`
and a full `onKeyDownSearch` that moved it and added `filteredMedicines[highlight]` on Enter — but
`highlight` was **never passed to the picker component**, so no row ever rendered as selected. A
grep for the identifier returned only its declaration and its one read. This is item #5's "dead
state" shape inverted: not a `_`-prefixed setter, but a fully-written feature missing its last wire.
**Fix.** Passed `highlight`/`setHighlight` into the picker, rendered the active row with a
`ring-2 ring-primary/30` treatment, and wired real combobox semantics — `role="combobox"` +
`aria-activedescendant` on the input, `role="listbox"`/`role="option"`/`aria-selected` on the
results, plus `scrollIntoView({ block: "nearest" })` so the cursor stays visible without stealing
focus from the input.
**Reusable rule.** When a screen holds an index/cursor/selection `useState`, grep for every read of
it before assuming the feature works. State that is written but never rendered is a feature that
does not exist — and it is far cheaper to finish the wiring than to rebuild it. Any list driven by
arrow keys needs the `combobox`/`listbox`/`aria-activedescendant` trio, not just a highlight style.

## 66. A "0 results" card stacked on an empty-state panel buried the actual answers
**Symptom.** Searching a slightly misspelled medicine ("DINAPAR") produced a full-width
*"Saved matches — No saved medicine matched — 0"* card **plus** a dashed "No medicine found"
panel — two stacked negatives — while four real matches sat below the fold.
**Root cause.** The empty branch rendered a complete section header (icon, title, subtitle, count
chip) for a section with nothing in it, then a second bordered panel for the call to action, before
the fallback results.
**Fix.** Collapsed both into one quiet line (`Nothing saved in your clinic for X` + a `variant="light"`
action) and promoted the database results, retitling them "Matches in the drug database" when they
are the only answer. Also added typo-tolerant ranking (`helpers/medicineSearch.ts`) so the best
match sorts to index 0 — which matters doubly once Enter adds `list[0]`.
**Reusable rule.** An empty section deserves one line, not a full section header plus a panel.
Never give a zero-count result the same visual weight as a populated one, and never let it outrank
the content that *does* answer the query. If a list is keyboard-addressable, its sort order is a
correctness concern, not a cosmetic one.

## 67. Sorting a hand-ordered option list "properly" is a regression
**Symptom.** While extracting the duplicated schedule-pattern list into a shared helper, generating
it with a triple loop produced clean numeric order — and buried the two most-used dose patterns
("1-1-1", "1-0-1") behind eight "0-*" patterns in a 104px-tall scrolling dropdown.
**Root cause.** The original hand-written array *looked* unsorted and arbitrary; it was actually
ordered by clinical frequency.
**Fix.** Kept the generated list for the editor (which legitimately wants all 27 including "0-0-0")
and preserved the hand-tuned order verbatim for the picker, with a comment recording why it is not
sorted.
**Reusable rule.** Before "tidying" a literal array during a refactor, ask what its order encodes.
Frequency-ordered option lists are a deliberate UX affordance; replacing one with numeric or
alphabetical order is a silent usability regression that no test or type-check will catch.

## 68. Two add-paths drifted: one honoured the inline dose, the other silently discarded it
**Symptom.** The completed-prescription edit modal reuses the same picker as the main workspace, but
a dose configured inline there was thrown away — the medicine landed on the form default.
**Root cause.** `addMedicineDirect(m, quick)` implemented the whole quick-dose mapping inline, while
its sibling `addMedicineDirectEdit(m)` never declared the second parameter at all. Nothing failed
loudly: the extra argument was simply dropped.
**Fix.** Extracted the mapping into `applyQuickDose(base, quick)` in `doseHelpers.ts` and routed both
functions through it, including the `notes`/`dosage` side-effects.
**Reusable rule.** When a shared component is handed two different callbacks for the same job, diff
their **signatures**, not just their bodies. An optional parameter that one implementation omits is
invisible to TypeScript at the call site and produces silent data loss.

## 69. A field shown in two places on the same screen reads as two different facts
**Symptom.** Redesigning the completed-prescription view (Clinical Summary card + medicine table +
a new patient-facing `PrescriptionNoteBar`) put the doctor's advice and the follow-up date into the
note bar — while `PrescriptionPreviewSummary` above the table was already rendering both, so the
same sentence appeared twice, a few hundred pixels apart.
**Root cause.** The summary component predates the note bar and had no notion of anything else
owning those fields; it rendered every non-empty key it knew about.
**Fix.** Added an explicit `showPatientFields` prop (default `true`) rather than deleting the branch
— the component has a **second** consumer, the live-preview panel in `collapse` mode, which still
legitimately wants advice and follow-up inline because it has no note bar of its own.
**Reusable rule.** Two rules stack here. (1) When promoting a field into a new dedicated component,
grep the screen for anywhere else it already renders — duplication reads as two separate
instructions, not as emphasis. (2) Per #39, suppress it with an opt-out prop defaulted to today's
behaviour, never by deleting the render branch: the consumer you did not open still needs it.

## 70. "5 Days" is a duration the reader has to resolve; a date range is one they can just read
**Symptom.** The completed medicine table showed each drug's duration only as a day count, anchored
to nothing.
**Root cause.** `Dose` stores duration in days by design (payload/backward-compat) and carries no
start date, so the table had no calendar anchor available locally.
**Fix.** Added `buildDurationDateRange(dose, prescribedAt)` to `doseHelpers.ts` and threaded
`reportCard.createdAt` down as a `prescribedAt` prop. It returns `""` when there is no valid anchor
date, so the cell falls back to the bare day count instead of rendering a broken range.
**Reusable rule.** A derived-display helper that depends on optional upstream data should return an
empty value the caller can fall back from, not a partially-computed or `Invalid Date` string. Put
the fallback decision in the JSX where the alternative is visible, not inside the helper.

## 71. An overlay toolbar over a tab strip needs a magic gutter — and hides itself on small screens
**Symptom.** The Digital Prescription switch and "Customize Sections" button in the appointment
tab bar were `absolute right-0 ... hidden xl:flex`, with `xl:pr-[17rem] 2xl:pr-[22rem]` on the tab
list to reserve room. Below 1280px both controls were unreachable — nobody on a laptop or phone
could switch prescription mode at all — and the reserve was a hand-guessed number that would not
track a label change. `pointer-events-none` on the overlay with `pointer-events-auto` per child was
a symptom of the same overlay choice.
**Root cause.** The obvious fix — wrap `<Tabs>` in a flex row next to the actions — is wrong here:
HeroUI's `Tabs` returns a **Fragment** whose children are the tab-list `base` div *and the tab
panels as siblings*. Wrapping it drags the whole panel into the narrow tab column.
**Fix.** Made the container a grid (`lg:grid-cols-[minmax(0,1fr)_auto]`) and placed the pieces
explicitly through the Tabs slots: `base` → `col-start-1 row-start-1`, actions → `row-start-2` on
mobile / `col-start-2 row-start-1` from `lg`, `panel` → `lg:col-span-2` on its own row. Actions are
now always visible, no reserve gutter exists, and the panel still spans the full width.
**Reusable rule.** Before wrapping a compound component to lay it out, check what it actually
renders — a component that emits siblings from a Fragment cannot be positioned by wrapping. Use a
grid on the parent plus explicit placement on the component's own class slots. And treat any
`hidden {breakpoint}:flex` on a *control* (not decoration) as a bug: that is a feature deleted for
every user below the breakpoint, not a responsive adaptation.

## 72. A switch whose label is a plain div is a control most users can't hit
**Symptom.** The Digital Prescription toggle was a bordered pill containing a `cursor-default` label
div and, beside it, a small HeroUI `Switch`. Clicking the words "Digital Prescription" — the largest
and most obvious target — did nothing; only the ~36px switch worked. Two nested `Tooltip`s (one on
the label, one on the switch) also fought over the same hover.
**Root cause.** The pill was assembled from a label and a switch rather than being one control.
**Fix.** Moved the text inside `<Switch>` as its child (HeroUI renders it as a real `<label>`) and
styled the pill through `classNames.base`, so the entire pill is the hit target, the accessible name
comes from the label instead of a separate `aria-label`, and one tooltip covers the whole thing.
**Reusable rule.** If a label sits *next to* a form control instead of inside its `<label>`, it is
decoration, not a target. Style the control's own wrapper slot to look like the container you
wanted; never build a fake one around it. Also: nested tooltips on a parent and its child both fire
— only one element in a control should own the tooltip.

## 73. A tooltip on a self-explanatory control is noise that fires on every click attempt
**Symptom.** The Digital Prescription pill felt irritating to use: because #72 made the *whole* pill
the hit target, the tooltip now fired every single time the user moved to click it — and it only
restated what the label and switch position already showed ("Digital prescription is on…").
**Root cause.** The tooltip was attached unconditionally, treating "has a tooltip" as a quality bar
rather than asking whether the control could already express the thing itself.
**Fix.** Attach the tooltip only when the control is disabled — the one state the UI genuinely
cannot express — and render the switch bare otherwise. Added a padlock glyph in the label so the
locked state is visible without hovering at all, leaving the tooltip to supply only the *reason*.
The secondary "Customize Sections" button keeps its tooltip but with `delay={600}`, long enough that
passing over it en route to something else never triggers it.
**Reusable rule.** A labelled control that shows its own state needs no tooltip. Reserve tooltips
for what the control cannot say: why it is locked, what a bare icon means, what a truncated value is
in full. And when the hit target is large, an instant tooltip becomes a flicker on every
interaction — either raise the delay or drop it.

## 74. Use `components/shared/Tooltip`, not HeroUI's, and check its dark mode before assuming
**Symptom.** Tooltips across the appointment tab bar were raw `@heroui/react` `Tooltip`s with default
styling, inconsistent with the rest of the app.
**Root cause.** `components/shared/Tooltip.tsx` exists (a thin HeroUI wrapper applying the app's
content styling and merging per-call `classNames`), but is easy to miss because the import name is
identical to HeroUI's — a call site reads the same either way.
**Fix.** Swapped the tab bar's tooltips to the shared wrapper, keeping `showArrow` and explicit
`delay` values at the call sites.
**Reusable rule.** `grep -n 'Tooltip' <file>` and check the **import**, not the usage — an identical
JSX tag can be either component. Note the shared wrapper's `bg-white` default *is* dark-safe here,
because `index.css` carries an explicit `.dark .bg-white` remap; that is the exception to playbook
item 6, and worth confirming rather than assuming in either direction.

## 75. Put a settings shortcut next to the thing it configures, not in the page chrome
**Symptom.** "Customize Sections" sat in the appointment tab bar, competing with the tab strip and
the prescription-mode picker for a strip of space that was already over-subscribed — while the
sections it actually configures (Diagnosis, Vitals, Advice, Habits, …) live inside the
clinical-details drawer, a completely different surface.
**Root cause.** The shortcut was placed where there happened to be room, not where its subject was.
**Fix.** Added a `headerAction` slot to `ClinicalDrawer` and moved the control there as a gear
icon-button beside the close button, so it reads as "configure *these* sections". The gate that
decided whether to show it (`activeTab === "prescription" && isDoctor && !isCompletedStatus`) was
kept intact and threaded down as an optional `onOpenPreference` callback — undefined simply hides
the shortcut, so no role check had to be duplicated at the new location.
**Reusable rule.** When a control configures a specific surface, host it on that surface. Thread the
existing permission/visibility gate down as an **optional callback** rather than re-deriving the
role check at the new site — `undefined` becomes the "not allowed" state for free, and there is only
ever one place the rule is written.

## 76. Ten pastel icon tints give a doctor no hierarchy — including for the dangerous field
**Symptom.** Every section in the clinical-details drawer picked its own tint: violet, amber, yellow,
slate, cyan, rose, blue, fuchsia, emerald, teal. Nothing stood out because everything did — least of
all Allergy, the one field that changes what is safe to prescribe.
**Root cause.** Colour was being used decoratively, per-section, with no rule behind it.
**Fix.** One shared `iconToneClass(tone, filled)` in `shared-ui.tsx`: brand tint when a section has
content, neutral when empty, and `tone="danger"` reserved for Allergy alone. The ten bespoke
`iconClassName` props are gone.
**Reusable rule.** In a list of peers, colour must encode *state* or *severity*, not identity. If
every row has its own hue, none of them mean anything — pick one accent, vary it by filled/empty,
and spend the second colour on the row that carries risk.

## 77. A collapsed row should preview its own content, not restate its title
**Symptom.** Collapsed sections read "Diagnosis / Add diagnosis details", "Allergy / Add patient
allergies" — the subtitle just repeated the title in verb form. Finding out what had already been
entered meant expanding all ten sections one at a time.
**Root cause.** The subtitle was a static prop, so it could not reflect the value underneath it.
**Fix.** `buildSectionSummaries()` derives a one-line preview per section from the draft ("Fever,
Headache", "BP 120/80 · Pulse 78", "5 days · 07 Aug 2026"). `SectionCard`/`ActionRow` render the
summary when non-empty and fall back to the static prompt only when the section is genuinely empty —
the one case where a prompt is the more useful string. Added a `filled/total` progress bar too.
**Reusable rule.** An accordion whose rows only show labels forces the user to open everything to
read the state. Put the value in the collapsed row and keep the prompt for the empty case; a static
subtitle that paraphrases the title is pure height.

## 78. A modal stacked on a drawer, that closes after every pick
**Symptom.** Choosing visiting days opened a centre modal on top of the clinical-details drawer — a
second overlay for picking a date — and it called `onClose()` on every selection, so recording three
dates meant three open/pick/close cycles.
**Root cause.** The picker was built as a modal before the surrounding surface became a drawer, and
the close-on-select was carried over from a single-date interaction.
**Fix.** Replaced it with an inline `VisitingDayCalendar` inside the section: multi-select, toggling
a selected date off in place, past months blocked from navigation, today ringed. `VisitingDaysModal`
and the now-unused `CenterModal` were deleted along with their state plumbing.
**Reusable rule.** Never stack an overlay on an overlay for a picker — inline it into the surface
that opened it. And a multi-value picker must not close on select: check whether the field is one
value or many before wiring `onClose` into the selection handler.

## 79. Moving something into an overlay removes it from the moment it is needed
**Symptom.** The clinical details (allergies, diagnosis, vitals) live in an overlay drawer, and the
patient strip's duplicate copies were removed as redundant. Net effect: while a doctor was actually
choosing drugs — the one moment allergies and dosing weight matter — none of it was on screen. The
"it's covered elsewhere" surface (`PrescriptionPreviewSummary`) turned out to render only in the
*completed* view and in `collapse` mode, never in the `tab` mode this screen actually uses.
**Root cause.** Two changes that were each locally correct: the drawer freed the medicine table's
width, and de-duplicating the strip removed a second source of truth. Neither accounted for the
combination leaving zero always-visible copies during the editing flow.
**Fix.** A pinned `PrescriptionClinicalContextBar` above the medicine table, reading the same live
draft the drawer edits and doubling as the shortcut into it. Allergies get asymmetric treatment on
purpose: an *absent* allergy record is itself a safety signal, so it renders "Not recorded" in
warning tone rather than staying silent, while diagnosis and vitals simply disappear when empty.
Gated to non-`collapse` layouts — `collapse` keeps the panels in a permanent right column and
renders no drawer, so the strip would both duplicate them and have nothing to open.
**Reusable rule.** Two rules. (1) Before deleting a duplicated field because "it's shown elsewhere",
verify *elsewhere* renders in the same state/mode the user is in — grep the render sites, don't
trust the component's existence. (2) Safety-critical context belongs next to the action it
constrains, not one click away; and for such a field, "not recorded" must be displayed, because
silence is indistinguishable from "none" exactly when that difference matters.

## 80. Five tabs, five slightly different titles — inline markup is how a strip drifts
**Symptom.** After the tab strip's `tabContent` slot moved to the `primary` token, the icons *inside*
each tab title still carried `text-teal-600 dark:text-[#46beae]`, so icon and label were painted from
two different sources. Alongside that: one icon had a stray `text-[13px]` the other four didn't, two
tabs declared a `sm:hidden` "short" label identical to the full one, and the four panels each chose
their own top spacing (`pt-3 sm:pt-4`, `p-3 sm:p-5`, none), so switching tabs nudged the content.
**Root cause.** Every tab inlined its own title markup and its own panel wrapper. Nothing enforced
that the five stayed identical, so each edit drifted one of them.
**Fix.** One `AppointmentTabTitle` component for all five titles, and the top spacing moved onto the
`Tabs` `panel` class slot so there is a single place that decides it.
**Reusable rule.** Repeated markup in a list of peers (tabs, steps, stat tiles) will drift — extract
it the second time it appears, not the fifth. For spacing in particular, prefer the parent's shared
slot over per-child wrappers: a value set in one place cannot disagree with itself.

## 81. Two greens on one screen because one component predates the token
**Symptom.** The appointment flow stepper sits directly above the tab strip and used raw `teal-*`
(`bg-teal-600`, `ring-teal-500`, `bg-teal-50/70`) while the tabs resolve from `--color-primary`
(#0a6c74). Two different greens, ~40px apart.
**Root cause.** The stepper was written before the palette was tokenized and nothing forced it to
follow. Its title also carried a blanket `dark:text-white` that overrode the done/active/pending
`titleClass` entirely, flattening all three states into one colour in dark mode.
**Fix.** Stepper accents now read from `primary`/`surface-muted`/`line`/`text-*`, and the blanket
`dark:text-white` is gone so the state colours survive the theme switch.
**Reusable rule.** When tokenizing one component, check its immediate neighbours on screen — a token
swap that stops at the component boundary produces a visible seam, which is worse than the
consistent-but-untokenized state you started from. And a blanket `dark:text-*` on an element that
also receives a computed state class silently wins over it; grep for both on the same element.

## 82. A component defined inside another component remounts its subtree every render
**Symptom.** `PrescriptionClinicalContextBar` declared its `Item` sub-component inside the render
body — convenient, since `Item` closed over nothing and was only used three times.
**Root cause.** A function component created during render is a *new component type* on every pass.
React compares types, not source, so it cannot reconcile the old element with the new one: it
unmounts the entire subtree and mounts a fresh one each render. Any state, focus or transition
inside it is destroyed, and this bar re-renders on every keystroke in the clinical drawer.
**Fix.** Hoisted `Item` to module scope with its props typed in `src/types/prescription`.
**Reusable rule.** Never declare a component inside another component's body — hoist it to module
scope (pass what it needs as props) or inline the JSX directly. `grep -n 'const [A-Z].*React.FC<'`
inside a component body finds these; they are invisible to both TypeScript and ESLint.

## 83. Running the playbook checklist finds dead code the feature work walks straight past
**Symptom.** A checklist pass over the prescription screens turned up `PrescriptionCompletedCard.tsx`
(101 lines) with **zero** references anywhere — it had been superseded by
`PrescriptionCompletedList` and simply left behind. Separately, `PrescriptionDetailsForm.tsx`
(~300 lines) plus `ComplaintsSection` are reachable only when `resolvedLayout === "form"`, which
requires `variant` to be something other than `"withoutComplaints"` — and *both* live consumers pass
`withoutComplaints`. So the form branch never executes today.
**Fix.** Deleted the orphan outright. Left the form branch in place and flagged it: unlike the
orphan it is reachable through a public prop combination, so deleting it is an API decision, not a
cleanup.
**Reusable rule.** Distinguish the two kinds of dead code before deleting. *Unreferenced* (no import
anywhere) is safe to remove. *Unreached* (imported and wired, but behind a prop/flag combination no
current caller uses) is a product decision — report it, don't quietly delete it. Run
`grep -rn '<ComponentName' src` for the first kind and trace the actual prop values for the second.

## 84. Four accent colours in one 400px dialog, and a silently-dead Tailwind class
**Symptom.** The "Add Favourite Prescription" dialog ran an `amber-50 → white → emerald-50` gradient
header, an amber-bordered "Note:" box in amber text, an emerald focus ring on the input, and a raw
`bg-teal-600` Done button — four accents, none of them `--color-primary`, on a screen whose every
other control is brand teal. The amber note also read as an error when nothing was wrong: the save
simply happens later.
**Root cause (the interesting half).** The note box was `bg-warning/15/70` — a **double opacity
modifier**, which Tailwind does not parse, so the class generated *nothing*. The box had no
background at all and nobody noticed, because a transparent box behind amber text still looks
deliberate. A codebase grep found the same shape elsewhere (`bg-primary/10/40`,
`bg-primary/10/5`, `bg-primary/100/10`) — all from a palette find-and-replace that rewrote
`bg-emerald-50` to `bg-primary/10` without noticing the target already carried an opacity suffix.
**Fix.** Single brand accent throughout, the note demoted to a neutral `surface-muted` info row with
an `FiInfo` glyph, tokenized borders/text, `Done` disabled until a name is typed, and the
character counter restored (it was commented out while `maxLength={50}` still silently truncated).
**Reusable rule.** `grep -rnE '(bg|text|border)-[a-z-]+/[0-9]+/[0-9]+' src` — a second `/NN` makes
the whole utility a no-op, and it fails invisibly rather than loudly. Run it after any bulk palette
migration. Separately: count the accent colours in a dialog before shipping it; more than one
means the design is competing with itself, and amber/red must be reserved for states that are
actually wrong.

## 85. A control that does nothing, in the toolbar of a "designer"
**Symptom.** The prescription Template Designer's toolbar had a paper-size `Select` offering
A4 / A5 / Letter. It was `selectedKeys={["a4"]} onSelectionChange={() => { }}` — hardcoded open,
hardcoded closed. Nothing in the page, the save payload, or the backend template ever read a paper
size; all four templates are `@page { size: A4 }` unconditionally.
**Root cause.** The toolbar was copied wholesale from `QuickPrintTemplates`, where the page-size
select *is* wired (it drives `PAGE_SIZES[pageSize]` and the print window). The copy kept the markup
and dropped the state.
**Fix.** Removed the dead control rather than wiring it — making it real means changing the backend
templates' `@page` rule and the saved template payload, which is a feature, not a UI pass.
**Reusable rule.** Distinct from #83's two kinds of dead code, this is a third: a *live-looking but
inert* control. It is worse than unreferenced code because users act on it and silently get nothing.
`grep -n 'onSelectionChange={() => *{ *}}\|onChange={() => *{ *}}\|onPress={() => *{ *}}'` after any
copy-paste of a toolbar between two screens — an empty handler next to a populated option list is
the signature. And when copying a toolbar, copy the state it drives or delete the control.

## 86. Four arbitrary brand hues for four layouts of the *same* prescription
**Symptom.** The template picker gave each layout a fixed accent swatch — teal, blue, violet, amber —
none of which had anything to do with what that template renders. A doctor whose palette is teal saw
a violet chip on "Medi Handwritten" and reasonably read it as "this one prints violet".
**Root cause.** Colour was encoding template *identity* (playbook item/log #76 again), and the tiles
carried no structural information at all — four near-identical text cards distinguished only by a
decorative hue.
**Fix.** `TemplateThumbnail.tsx` draws a scaled structural sketch of each backend template (ruled
left margin, letterhead split, cream handwritten pad, full-width banner) **in the doctor's own live
palette**, so the four tiles differ by layout — the thing that actually differs — and all four
restate the currently-selected colours. Changing the palette restyles all four thumbnails at once.
**Reusable rule.** When a picker chooses between *layouts*, the thumbnail must vary by layout and
hold colour constant; when it chooses between *palettes*, vary colour and hold layout constant.
A tile that varies the dimension the control does not select is actively misleading. And keep
thumbnails driven by live state — a hardcoded swatch drifts from what the preview shows.

## 87. "Preview-dominant" means fit the sheet to the viewport, not make it bigger
**Symptom.** First pass at prioritising the live preview gave it a `max-w-[820px]` A4 box scaled to
the panel's *width*. At 820px wide an A4 sheet is ~1160px tall, so the panel grew past the viewport
and the whole page scrolled — the doctor still could not see a full prescription at once, which was
the entire point of enlarging it.
**Root cause.** Scaling to one axis. A fixed-aspect document has to be fitted against both.
**Fix.** The stage measures itself and the sheet takes `min(width/794, height/1123)`, inside a
`lg:h-[calc(100dvh-7rem)]` panel — the full page is always visible, and the settings column beside it
is a separate bounded `lg:sticky lg:overflow-y-auto` scroll region with the Save bar pinned at its top.
**Reusable rule.** For any fixed-aspect document preview (A4, receipt, card), fit on `min(w/W, h/H)`
against a height-bounded container, and give each column its own scroll region rather than letting
one tall child scroll the page. `ResizeObserver` on the stage, not a window resize listener — the
column changes size when a sibling panel collapses, which `resize` never fires for.

## 88. An accordion inside an accordion, to change one colour
**Symptom.** "Fine-tune individual colours" opened a 240px scroll box of ten two-line rows; each row
was a *button* that expanded to reveal the actual colour input. Changing one colour cost: expand the
section, scroll to the row, click the row, then use the picker — inside a 300px rail. A
document-level `mousedown` listener existed purely to close the inner expansion.
**Root cause.** The swatch was rendered as a decorative `<div>`, so a separate control had to be
revealed to do the editing. That second disclosure layer is what forced the scrolling and the
outside-click state machine.
**Fix.** The swatch **is** the `<input type="color">` — click it and the native picker opens, no
expansion step. The hex sits beside it as a live text input. That deleted `activeColorRole` state,
its two props, and the document listener outright. Rows collapsed from two lines to one, grouped
under Brand / Text / Paper / Alert headings with a one-line caption saying what each group risks.
**Reusable rule.** If a row's only job is to reveal an input, delete the row and render the input.
`input[type=color]` styles into a plain circle with
`appearance-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full`. An
outside-click listener that only closes an inline expansion is a signal the expansion shouldn't
exist. And when a list of settings has a "don't break this" member (page background, alert red),
group it and say so in a caption rather than leaving all N looking equally safe to change.

## 89. The font picker never worked, and no screenshot could have shown it
**Symptom.** Selecting any font left the prescription preview visually identical.
**Root cause.** Two independent bugs in the backend templates. (1) `font-family:
'{{templateConfig.fontFamily}}'` interpolated a CSS *stack* inside quotes, producing
`font-family: 'Poppins, sans-serif'` — a single family name matching nothing, so every template
silently fell back to Arial. The setting had never applied, for any font, since the templates were
written. (2) The Google Fonts href used `family={{primaryFont}}` with no weight axis and no URL
encoding, so two-word families (`Open Sans`) produced an invalid request.
**Fix.** Templates now use `{{templateConfig.primaryFont}}` (the bare family) in CSS and a
precomputed `{{{templateConfig.fontUrl}}}` for the link — triple-stache, because Handlebars escapes
`=` and corrupts a query string. `buildFontUrl` encodes spaces, requests real weights, and returns
empty for non-Google families so the `{{#if}}` guard skips a dead link.
**Reusable rule.** A "font stack" value and a "font family" value are not interchangeable, and
quoting turns the mistake silent rather than loud — CSS just moves to the next fallback. When a
setting appears to do nothing, render it and diff the *output*, don't trust the control. And
Handlebars escapes `=`: any interpolated URL with a query string needs `{{{ }}}`.

## 90. The Payment History toolbar wrapped to two rows on desktop
**Symptom.** On laptop/desktop widths the payment toolbar rendered the search box alone on one row
and the date range + Type/Status/Mode/Doctor filters on a second, unlike every other list screen
whose toolbar is a single row.
**Root cause.** The toolbar was copied from `AppointmentToolbar`, which has *two* filter controls,
but Payment History has five. The inherited fixed `lg:w-[320px]` search plus five generous fixed
filter widths (190/190/170/200 + the ~300px date group) summed past the container, and
`lg:flex-wrap` dutifully broke the line. The search was also left at `h-11` while every other
toolbar uses `h-10`, so it read as a different component even before the wrap.
**Fix.** Search became `lg:min-w-[200px] lg:max-w-[300px] lg:flex-1` so it absorbs the slack instead
of dictating it; filter widths tightened to 160/160/150/180; the filter block got
`lg:shrink-0 xl:flex-nowrap`; search and the mobile Filters button dropped to `h-10`.
**Reusable rule.** In a wrap-enabled toolbar, exactly one element should be flexible — the search —
and every other control fixed. A fixed-width search is fine with two filters and guarantees a second
row with five, so re-budget the widths whenever you copy a toolbar into a screen with more filters.
Control heights are part of the shared look: `h-10` across all toolbars, no per-screen `h-11`.

## How to use this log on another page
Before editing a screen, scan the "Reusable rule" lines above — most appointment fixes
(stat-grid, token swaps, type extraction, mobile view control) apply directly to the dashboards,
lab, pharmacy, and onboarding screens.
