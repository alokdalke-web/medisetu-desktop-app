# Page Audit Checklist

A literal, copy-pasteable checklist for auditing or building a list/table + toolbar + stat-card
style page (the shape of `/app/appointments` and `/app/patients`). Run every item against the
page's own files before calling it done. Each item links to the full reasoning in
[`UI_PLAYBOOK.md`](./UI_PLAYBOOK.md) / [`UI_CONVENTIONS.md`](./UI_CONVENTIONS.md) /
[`UI_REMEDIATION_LOG.md`](./UI_REMEDIATION_LOG.md) — this doc is the checklist, not the explanation.

Replace `<files>` with the page's own files, e.g.:
```
FILES="src/pages/<feature>/<Page>.tsx src/pages/<feature>/components/**/*.tsx src/pages/<feature>/helpers/*.ts"
```

## Color / dark mode

- [ ] `grep -n 'dark:.*slate-[0-9]' <files>` — every hit reviewed against what that step
      resolves to in `.dark` (index.css). (Playbook #1)
- [ ] `grep -n 'bg-white\b' <files>` — every hit has been replaced with `bg-surface`
      (`--color-white` is intentionally never inverted). (Playbook #6)
- [ ] `grep -n 'border-slate-200\|dark:bg-\[#\|dark:text-white\|dark:border-\[#' <files>` — no
      redundant `dark:` hex pairs left; base classes rely on auto-inversion or use tokens.
      (Playbook #2)
- [ ] Shell/layout components checked too, not just the page — `Layouts/MainLayout.tsx`,
      `components/shared/Sidebar.tsx`, `components/shared/Header.tsx`, any `*Skeleton` component.
      A miss there breaks pages whose own content is already correct. (Playbook #6)
- [ ] `grep -n 'bg-\(red\|orange\|yellow\|green\|blue\|purple\|pink\)-\(50\|100\)\b' <files>` —
      status chips/badges/accent icons using a raw light palette step need the alpha-based
      `bg-{color}-500/10 text-{color}-700 dark:text-{color}-400 border-{color}-500/20` pattern
      instead — these colors have no `.dark` remap at all. (Playbook #12, `UI_REMEDIATION_LOG.md` #30)

## Accessibility

- [ ] Every icon-only `<button>` has `aria-label` (not just `title`).
- [ ] Every icon-only button is `h-10 w-10` base/mobile, `lg:h-8 lg:w-8` from `lg` up (or the
      pill-button ladder `h-10 lg:h-7 px-3 lg:px-2` for text toggles). (Playbook #3)
- [ ] Every custom dropdown (not HeroUI `<Select>` or the shared `AutocompleteField` — both already
      carry full internal ARIA) has `aria-haspopup="listbox"` + `aria-expanded` on the trigger,
      `role="listbox"` on the popover, `role="option"` + `aria-selected` on each item. (Playbook #3)
- [ ] Every sortable table header uses a real `<button>` inside the `<th>` (with `aria-sort` on
      the `<th>`), not a bare `<th onClick>`. (`UI_REMEDIATION_LOG.md` #19)
- [ ] Every interactive element has `cursor-pointer` set explicitly (buttons included, not just
      non-button clickable `<div>`/`<tr>` elements) — this codebase's convention, not left to the
      browser default. Skip disabled elements (`cursor-not-allowed` is correct there).
      (`UI_REMEDIATION_LOG.md` #40)
- [ ] Every filter `<input>` with only a `placeholder` also has an `aria-label`.
      (`UI_REMEDIATION_LOG.md` #19)

## Table shape (any desktop `<table>` view)

Check against the reference implementations (`AppointmentTable.tsx`, `PatientTable.tsx`,
`TransactionTable.tsx`, `NoShowTable.tsx`) and `UI_CONVENTIONS.md` §1 "canonical table shape" —
looking similar isn't the same as behaving the same. (`UI_REMEDIATION_LOG.md` #31)

- [ ] Outer card (`rounded-lg border border-line bg-surface shadow-[...] dark:shadow-none`) wraps
      the scroll container **and** `BottomControls` together, not split across page-level markup.
- [ ] Loading state uses the shared `SkeletonBlock` avatar+2-lines shape, not a bespoke
      per-column skeleton.
- [ ] Empty state is a single inline `<tr><td colSpan={N}>...</td></tr>` message, not a separate
      illustration/SVG component swapped in at the page level.
- [ ] The whole `<tr>` is clickable (`onClick` → view details) with `role="button" tabIndex={0}
      onKeyDown` for Enter/Space, not just an icon button in an Action column.
- [ ] If a per-row icon button exists, it does something the row-click doesn't already do —
      otherwise it's a redundant duplicate control and should be removed.
- [ ] Identity cells (primary row subject, and any secondary person/entity column) use a HeroUI
      `<Avatar name={...} src={...} size="sm" />`, not a hand-rolled colored circle + static icon.
- [ ] Any status/count chip in a table cell uses the `StatusChip`-style dot-chip pattern
      (`Chip variant="dot"`, borderless, `px-3 py-1.5`, `text-xs font-medium`) — not a bordered
      outline pill or an icon-led badge. (`UI_REMEDIATION_LOG.md` #32)

## Card/grid shape (any mobile-card or grid-toggle view)

Audited **separately** from the table — matching the table doesn't mean the card view matches too.
Check against `AppointmentCardGrid.tsx` and `UI_CONVENTIONS.md` §1 "canonical card grid shape".
(`UI_REMEDIATION_LOG.md` #33)

- [ ] Whole card is `role="button" tabIndex={0}` with `onClick`/`onKeyDown`, not a separate
      "Details"/"View" button duplicating the same navigation.
- [ ] Header uses `Avatar`, not a hand-rolled colored circle + static icon.
- [ ] A secondary entity (doctor, etc.) gets its own `rounded-xl bg-surface-muted` strip with its
      own `Avatar`, not just a plain inline row.
- [ ] Skeleton mirrors the real card's actual sections, not a generic stack of lines.
- [ ] Empty state is a bordered card (`rounded-2xl border border-line ... p-10 text-center`), not a
      bare paragraph.
- [ ] The grid view has its own `BottomControls` (`variant="plain"`) — pagination isn't skipped
      just because the table view already has it.

## Layout / responsiveness

- [ ] No fixed pixel widths for layout (`w-[320px]`) — fluid `w-full` + `max-w-*`.
- [ ] Tables wrapped in `overflow-x-auto` with a sensible `min-w`, never a page-body horizontal
      scroll.
- [ ] If there's a fixed stat/KPI tile count that doesn't divide evenly (5, 7, …): single-row
      swipe strip below the "all fit in one row" breakpoint, straight to `grid-cols-N` there — no
      intermediate multi-row grid step. (Playbook #8, `UI_CONVENTIONS.md` §9)
- [ ] Any `overflow-x-auto` scroll strip (stat cards) uses a hover/active-reveal thin scrollbar
      (transparent at rest, visible on hover/drag) — never `scrollbar-hide` (no affordance at all)
      and not a permanently-visible one either (unwanted clutter at rest). Tables can keep an
      always-visible thin scrollbar. (`UI_REMEDIATION_LOG.md` #28)
- [ ] Any collapsible mobile filter panel built as `mobileFiltersOpen ? "flex" : "hidden"` also has
      an explicit `lg:flex` (or the real "always visible from here" breakpoint) in its class list —
      not just `lg:flex-row`/`lg:w-auto` — or the panel silently vanishes on desktop by default.
      (`UI_REMEDIATION_LOG.md` #29)
- [ ] Primary "+ New X" action lives in `PageHeader`'s `actions` slot, and the button itself is
      icon-only below `sm` (full label from `sm` up) so it never wraps the header onto two rows.
      (`UI_REMEDIATION_LOG.md` #20, #21)
- [ ] Secondary filters (date range, status, etc.) collapse behind a mobile "Filters" toggle
      button below `lg`, staying inline from `lg` up — not stacked full-height on mobile.
      (`UI_REMEDIATION_LOG.md` #7)
- [ ] The collapsed filter panel itself is `flex flex-row flex-wrap items-center gap-3 lg:w-auto`
      (not `flex-col ... lg:flex-row`) so filters that get a fixed width at `sm` can actually wrap
      2-3 per row between `sm` and `lg`, instead of one-per-row the whole way. (Playbook #9,
      `UI_REMEDIATION_LOG.md` #26)

## Page header / back navigation

- [ ] Any page one level deep in a flow (detail/create/edit — e.g. New Appointment, Reschedule,
      Appointment Details, Add Patient) uses `components/shared/PageBackNav` (`backTo` + `crumbs`),
      not a hand-rolled `<nav>` of `Link`s or a plain `<button onClick={() => navigate(...)}>`.
      (Playbook #16)
- [ ] The breadcrumb's last crumb has no `to` — check it doesn't link to the current page itself
      (a real bug found more than once: "Appointment Details" linking to `/appointment/${id}`, the
      page you're already on). (`UI_REMEDIATION_LOG.md` #52)
- [ ] `backTo` goes to the actually-useful target for this caller, not always a generic list route —
      e.g. Reschedule's back button returns to the specific appointment (`/appointment/${id}`), not
      `/appointment`. (`UI_REMEDIATION_LOG.md` #50)

## Structure / performance

- [ ] If the page file is pushing 500+ lines or has several inline sub-components: split into
      `components/list/` + `components/toolbar/` + `helpers/<page>Formatters.ts`, with prop types
      in `src/types/<domain>/`. (`UI_CONVENTIONS.md` §1)
- [ ] Every component file's `type XProps`/`interface XProps` is imported from
      `src/types/<domain>/`, not declared inline — extend that domain's existing barrel `index.ts`
      rather than starting a new one. Before deleting a type/function's local declaration, grep the
      whole file for its name (not just inside the block being replaced) — a name used as both a
      prop-type field and a standalone inline cast/annotation elsewhere in the same file will
      silently break if only the Props type gets updated. (`UI_REMEDIATION_LOG.md` #49, #51)
- [ ] Any periodic/ticking state (clock, poll) lives in the one component that actually needs it,
      not a shared hook called from a parent that re-renders the whole page. (Playbook #4)
- [ ] No dead state — a setter prefixed `_` or a modal whose "open" callback is never called is a
      signal to trace, not ignore. (Playbook #5)
- [ ] Any CSS transition for theme switching excludes `color`/`fill`/`stroke` — only
      `background-color`/`border-color`/`box-shadow` animate. (Playbook #7)
- [ ] The page's main file lives next to its own `components/`/`helpers/` subfolder (e.g.
      `pages/<feature>/<Page>.tsx` alongside `pages/<feature>/components/`), not orphaned at a
      different directory level than the pieces it composes. If renaming/moving the main file,
      update its default export name too, and grep the whole repo for the old name before
      considering it done — check both the literal filename and the exported identifier.
      (`UI_REMEDIATION_LOG.md` #27)
- [ ] No decorative comment section dividers (`// ── Foo ──────`) and no comments that just
      restate the line/block directly below them — every remaining comment should explain a
      non-obvious "why" (a workaround, a business-logic rationale, an ordering guarantee), not
      narrate the "what" a good name already conveys. (`UI_CONVENTIONS.md` §11)

## Before calling it done

- [ ] `npm run lint` clean (no new errors; pre-existing warnings in unrelated files are fine).
- [ ] `npx tsc -b` clean.
- [ ] `npm run build` clean (full production build, not just typecheck).
- [ ] A new entry added to `UI_REMEDIATION_LOG.md` for anything fixed that's likely to recur on
      another screen.
- [ ] **Committed and pushed** — a local fix that passes `tsc -b` isn't verifiable anywhere real
      (staging, a teammate's checkout) until it's actually on the branch and pushed.
