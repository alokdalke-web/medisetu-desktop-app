# Infinity MediSetu — Frontend Architecture & Design System Rules

This document defines the comprehensive standards for the MediSetu healthcare application frontend. Every page, component, and feature must adhere to these rules to ensure consistency, scalability, and maintainability.

---

## Tech Stack

- **Framework:** React 19 + TypeScript 5.8
- **Build:** Vite 7
- **Styling:** Tailwind CSS 4 (CSS-based config via `@theme` in `src/index.css`)
- **Component Library:** HeroUI (formerly NextUI) — `@heroui/react`
- **State Management:** Redux Toolkit + RTK Query
- **Routing:** React Router v7
- **Forms:** React Hook Form + Zod validation
- **Font:** Outfit (sans-serif)

---

## Design System

### Color Tokens

All colors are defined as CSS custom properties in `src/index.css` under `@theme`. Never hardcode hex colors directly in components — always use Tailwind utility classes that reference these tokens.

**Semantic Colors:**
- `primary` (#0a6c74) — main brand actions
- `primary-hover` (#46beae) — hover state
- `primary-active` (#266960) — active/pressed state
- `secondary` (#2fae8e) — secondary accent
- `secondarybtn` (#e8f6f4) — secondary button background
- `background` (#f9fbfc) — page background
- `background-secondary` (#f2fffd) — card/section alt background
- `info` (#3371eb) — informational
- `info-secondary` (#8a38f5) — secondary info
- `success` (#128635) — success states
- `warning` (#ffbd11) — warning states
- `danger` (#dc3e57) — error/destructive states
- `muted` (#cbcbcb) — disabled/placeholder
- `border-color` (#cfcfcf) — default borders

**Status Colors (Figma chips):**
- `status-completed` / `status-completed-bg`
- `status-cancelled` / `status-cancelled-bg`
- `status-pending` / `status-pending-bg`
- `status-confirmed` / `status-confirmed-bg`

### Typography

- Font family: `font-outfit` (Outfit, sans-serif)
- Page titles: `text-xl 2xl:text-3xl font-semibold tracking-tight`
- Section headings: `text-[16px] sm:text-[18px] font-semibold`
- Body text: `text-sm` (14px)
- Small/helper text: `text-xs` (12px)
- Muted text: `text-slate-500` (light) / `dark:text-slate-400`

### Spacing

Use Tailwind spacing scale consistently:
- Page padding: `px-3 py-4 sm:px-5 sm:py-5 md:px-6 lg:px-8 lg:py-6`
- Section gaps: `gap-4 md:gap-5 lg:gap-6`
- Card padding: `p-4 sm:p-5 lg:p-6`
- Component internal spacing: `space-y-3` or `gap-3`

### Border Radius

- Cards/containers: `rounded-xl` or `rounded-2xl`
- Buttons (pill): `rounded-full`
- Buttons (standard): `rounded-xl`
- Inputs: `rounded-full` (via HeroUI `radius="full"`)
- Chips/badges: `rounded-md` or `rounded-full`
- Tables: `rounded-lg`

### Shadows

- Cards: `shadow-none` with `border border-gray-200` (prefer border over shadow)
- Elevated cards: `shadow-sm` or `shadow-md`
- Dark mode: shadows are automatically softened via CSS

### Icons

- Primary icon library: `react-icons` (Fi prefix — Feather Icons)
- Custom SVG icons: stored in `public/assets/icons/`
- Icon constants: `src/constants/icons.ts`
- Icon sizing: `text-lg` (18px) for inline, `h-5 w-5` or `h-6 w-6` for standalone

---

## Theme Support

### Implementation

- Theme hook: `src/hooks/useTheme.ts`
- Storage: `localStorage` key `"medisetu-theme"`
- Mechanism: `.dark` class on `<html>` root element
- Tailwind variant: `@custom-variant dark (&:is(.dark *))`

### Rules

1. **No hardcoded colors** — use Tailwind semantic classes (`text-slate-900 dark:text-slate-100`)
2. **Always provide dark variant** for custom colors: `bg-white dark:bg-[#111726]`
3. **Use CSS variables** for colors that must adapt: `var(--color-background)`
4. **Dark mode overrides** for HeroUI components use `classNames` prop with dark: variants
5. **Test both themes** before considering any UI work complete

### Dark Mode Color Mapping

| Light | Dark |
|-------|------|
| `bg-white` | `dark:bg-[#111726]` |
| `bg-slate-50` | `dark:bg-[#111726]` |
| `text-slate-900` | `dark:text-slate-100` or `dark:text-white` |
| `text-slate-500` | `dark:text-slate-400` |
| `border-slate-200` | `dark:border-[#273244]` |
| `bg-background` | automatic (CSS variable) |

---

## Responsive Design

### Breakpoints

Use Tailwind's default breakpoints:
- `sm:` — 640px (small tablet)
- `md:` — 768px (tablet)
- `lg:` — 1024px (small laptop)
- `xl:` — 1280px (laptop)
- `2xl:` — 1536px (desktop)

### Screen Size Support

| Device | Range | Layout |
|--------|-------|--------|
| Mobile | 320px–639px | Single column, hamburger nav, stacked forms |
| Tablet | 640px–1023px | Two columns where suitable, collapsible sidebar |
| Laptop | 1024px–1279px | Full sidebar (collapsed), multi-column |
| Desktop | 1280px–1535px | Full sidebar (expanded), multi-column |
| Large Desktop | 1536px+ | Max content width `max-w-[1600px]`, larger text |

### Responsive Rules

1. **Mobile-first approach** — write base styles for mobile, add breakpoints for larger screens
2. **No horizontal scrolling** — use `overflow-x-hidden` on page containers, wrap content
3. **Responsive grids:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
4. **Responsive text:** `text-sm sm:text-base lg:text-lg`
5. **Sidebar:** hidden on mobile (`hidden xl:block`), drawer on smaller screens
6. **Tables:** horizontal scroll wrapper on mobile (`overflow-x-auto`)
7. **Dialogs/Drawers:** full-screen on mobile, centered/side on desktop
8. **Navigation:** bottom bar or hamburger on mobile, sidebar on desktop

### Content Container

Max width constraint for large screens:
```tsx
<div className="mx-auto max-w-[1600px]">
  {children}
</div>
```

---

## Layout System

### Available Layouts

| Layout | Path | Purpose |
|--------|------|---------|
| `MainLayout` | `src/Layouts/MainLayout.tsx` | Primary authenticated dashboard layout with sidebar + header |
| `PatientLayout` | `src/Layouts/PatientLayout.tsx` | Patient-facing pages |
| `OnboardingLayout` | `src/Layouts/OnboardingLayout.tsx` | Clinic setup wizard |
| `ProfileLayout` | `src/Layouts/ProfileLayout.tsx` | User profile/settings pages |

### Layout Rules

1. **Never duplicate layout code** — wrap pages in the appropriate layout via route config
2. **Sidebar state** managed at layout level (collapsed/expanded)
3. **Header** is part of the layout, not individual pages
4. **Page content** receives consistent padding from the layout
5. **Breadcrumbs** rendered by layout based on route metadata
6. **Mobile nav drawer** controlled by layout state

---

## Navigation

### Sidebar (`src/components/shared/Sidebar.tsx`)

- Collapsible: `xl:grid-cols-[16rem_1fr]` expanded / `xl:grid-cols-[5rem_1fr]` collapsed
- Smooth transition: `transition-[width] duration-[520ms]`
- Mobile: overlay drawer with backdrop
- Active state: highlight current route
- Role-based menu items: show/hide based on user permissions

### Rules

1. Active route must be visually distinct (primary color highlight)
2. Nested navigation uses accordion/expandable sections
3. Mobile drawer closes on route change
4. Sidebar scroll uses thin scrollbar (`.sidebar-scroll` class)
5. Icons always visible; labels hidden when collapsed

---

## Shared Components

### Mandatory Reuse

Always use existing shared components instead of creating new ones:

| Component | Location | Use For |
|-----------|----------|---------|
| `AppButton` | `shared/AppButton.tsx` | All buttons (primary, outlined, dark, danger) |
| `InputField` | `shared/InputField.tsx` | All text inputs (RHF integrated) |
| `SelectField` | `shared/SelectField.tsx` | All dropdowns |
| `TextareaField` | `shared/TextareaField.tsx` | Multi-line inputs |
| `DatePickerField` | `shared/DatePickerField.tsx` | Date selection |
| `SearchField` | `shared/SearchField.tsx` | Search inputs |
| `StatusChip` | `shared/StatusChip.tsx` | Status badges/pills |
| `DataTable` | `shared/DataTable.tsx` | Simple data tables |
| `CommonTable` | `common/CommonTable.tsx` | Full-featured tables (pagination, loading, empty) |
| `PageHeader` | `common/PageHeader.tsx` | Page title + description + actions |
| `PageContainer` | `common/PageContainer.tsx` | Page content wrapper |
| `FilterBar` | `shared/FilterBar.tsx` | Date/filter controls |
| `MetricCard` | `shared/MetricCard.tsx` | Dashboard stat cards |
| `SectionCard` | `shared/SectionCard.tsx` | Grouped content sections |
| `TabNavigation` | `shared/TabNavigation.tsx` | Tab interfaces |
| `ActionButton` | `shared/ActionButton.tsx` | Icon action buttons |
| `Tooltip` | `shared/Tooltip.tsx` | Hover tooltips |
| `ProgressCircle` | `shared/ProgressCircle.tsx` | Circular progress indicators |

### Component Creation Rules

1. Before creating a new component, check if one already exists in `shared/` or `common/`
2. If a pattern appears 3+ times, extract it into a shared component
3. All shared components must support dark mode
4. All shared components must be responsive
5. Props should follow consistent naming (`isLoading`, `isDisabled`, `onPress`)
6. Use `className` prop for style overrides, never override internal styles

---

## Forms

### Standards

- **Library:** React Hook Form + Zod schemas
- **Validation schemas:** `src/schemas/` directory
- **All inputs** use shared field components (`InputField`, `SelectField`, etc.)
- **Label placement:** outside-top (via HeroUI `labelPlacement="outside-top"`)
- **Input shape:** pill/rounded-full for text inputs
- **Variant:** bordered

### Form Rules

1. Every form field must show validation errors inline
2. Required fields indicated via `isRequired` prop (shows asterisk)
3. Optional fields can show "(Optional)" via `isOptional` prop
4. Loading state: disable submit button + show spinner
5. Success feedback: toast notification or inline success message
6. Error feedback: field-level errors + form-level error alert if needed
7. Consistent spacing: `space-y-4` between form fields

---

## Tables

### Implementation

Use `CommonTable` (full-featured) or `DataTable` (simple) from shared components.

### Required Features

- Pagination (via `CommonTablePagination`)
- Loading skeleton (via `CommonTableLoading`)
- Empty state (via `CommonTableEmpty`)
- Error state (via `CommonTableError`)
- Responsive: horizontal scroll on mobile
- Row actions: action menu on last column
- Consistent header styling: `bg-transparent text-secondary text-base font-normal`

### Table Rules

1. Never build table UI from scratch — use shared table components
2. Tables must handle loading, empty, and error states
3. Mobile: allow horizontal scroll with `overflow-x-auto`
4. Pagination: show page info + prev/next controls
5. Search/filter: place above table in a filter bar

---

## Performance

### Rules

1. **Lazy load** page components via `React.lazy()` + `Suspense`
2. **Code splitting** — each page/feature bundle loads on demand
3. **RTK Query** for all server state — no manual fetch + useState patterns
4. **Memoize** expensive computations with `useMemo`
5. **Stable callbacks** with `useCallback` for event handlers passed to children
6. **Avoid unnecessary re-renders** — don't create objects/arrays inline in JSX props
7. **Image optimization** — use appropriate formats, lazy load below-fold images
8. **Virtualize** large lists/tables (100+ rows) with a virtualization library
9. **Bundle size** — prefer tree-shakeable imports (`import { Button } from "@heroui/react"`)

---

## Accessibility

### Rules

1. **Semantic HTML** — use `<main>`, `<nav>`, `<header>`, `<section>`, `<article>` appropriately
2. **ARIA labels** — all interactive elements must have accessible names
3. **Keyboard navigation** — all actions reachable via Tab/Enter/Escape
4. **Focus management** — trap focus in modals/drawers, return focus on close
5. **Color contrast** — minimum 4.5:1 for text, 3:1 for large text (WCAG AA)
6. **Screen reader** — status changes announced via `aria-live` regions
7. **Alt text** — all images have descriptive alt text or `aria-hidden` if decorative
8. **Form labels** — every input associated with a label (handled by HeroUI)

Note: Full WCAG compliance requires manual testing with assistive technologies and expert accessibility review.

---

## Animations

### Allowed Animations

- Sidebar collapse/expand: `transition-[width] duration-[520ms]`
- Drawer open/close: `framer-motion` slide transitions
- Page transitions: fade-in via `framer-motion`
- Card hover: `hover:shadow-md transition-shadow`
- Button press: HeroUI built-in press animation (or `disableRipple` for clean feel)
- Loading indicators: `animate-pulse` for skeletons
- Toast notifications: slide-in from top-right

### Animation Rules

1. Keep durations under 500ms for UI interactions
2. Use `framer-motion` for complex multi-step animations
3. Use Tailwind `transition-*` utilities for simple state changes
4. Respect `prefers-reduced-motion` — disable animations for users who request it
5. Never animate layout shifts that cause content reflow

---

## Code Quality

### Naming Conventions

- **Components:** PascalCase (`AppButton.tsx`, `StatusChip.tsx`)
- **Hooks:** camelCase with `use` prefix (`useTheme.ts`, `useAuth.tsx`)
- **Utils:** camelCase (`formatDate.ts`, `analytics.ts`)
- **Constants:** camelCase file, UPPER_CASE for exported constants
- **Types:** PascalCase with descriptive suffixes (`AppRoute`, `StatusChipProps`)
- **API slices:** camelCase with `Api` suffix (`clinicApi.ts`, `appointmentApi.ts`)
- **Redux slices:** camelCase with `Slice` suffix (`authSlice.ts`)

### File Organization Rules

1. One component per file (match filename to component name)
2. Co-locate component-specific styles, types, and utils with the component
3. Feature-specific components go in the feature's folder (`pages/appointment/components/`)
4. Truly shared/reusable components go in `src/components/shared/` or `src/components/common/`
5. Page-level components go in `src/pages/{feature}/`
6. Business logic hooks go in `src/hooks/`
7. API definitions go in `src/redux/api/`
8. Validation schemas go in `src/schemas/`
9. TypeScript types go in `src/types/`

### Code Rules

1. Remove unused imports and dead code
2. No `console.log` in production code (use proper logging)
3. No `any` types — use proper TypeScript types
4. Extract repeated logic into custom hooks or utilities
5. Keep components under 300 lines — split into sub-components if larger
6. Separate presentation from business logic (container/presenter or hooks pattern)
7. Use early returns to reduce nesting

---

## Project Structure

```
src/
├── assets/              # Static assets (gif, video, svg bundled by Vite)
├── components/
│   ├── common/          # Core reusable primitives (Table, PageHeader, Loader)
│   ├── shared/          # Domain-aware shared components (Sidebar, InputField, StatusChip)
│   ├── appointment/     # Appointment-specific shared components
│   ├── prescription/    # Prescription workspace components
│   └── ...              # Other feature-shared components
├── constants/           # Static data, icon paths, image paths
├── context/             # React contexts
├── hooks/               # Custom hooks
├── Layouts/             # Layout wrapper components
├── pages/               # Page components by feature
│   ├── appointment/
│   ├── auth/
│   ├── dashboard/
│   ├── patient/
│   ├── pharmacy/
│   ├── lab/
│   ├── configuration/
│   ├── profile/
│   └── ...
├── redux/
│   ├── api/             # RTK Query API slices
│   ├── slices/          # Redux state slices
│   └── middlewares/     # Custom Redux middlewares
├── routes/              # Route definitions and guards
├── schemas/             # Zod validation schemas
├── services/            # External service connections (socket.io)
├── types/               # Shared TypeScript type definitions
└── utils/               # Pure utility functions
```

---

## Healthcare Module Consistency

All healthcare modules (Dashboard, Patients, Appointments, Doctors, Lab, Pharmacy, Prescriptions, Billing, Configuration, Notifications, Users, Roles, Profile, Settings) must follow identical patterns:

1. **Page structure:** `PageHeader` → content area with cards/tables
2. **Data loading:** RTK Query with loading skeleton → data display → error state
3. **CRUD operations:** list view → detail view → create/edit form → delete confirmation
4. **Status display:** always use `StatusChip` with consistent status mapping
5. **Empty states:** meaningful illustration + message + action button
6. **Search/Filter:** placed above data tables using shared filter components
7. **Actions:** primary action in `PageHeader`, row actions in tables
8. **Navigation:** breadcrumbs showing hierarchy, tab navigation for sub-views

---

## QA Checklist

Before marking any UI work complete, verify:

- [ ] No console warnings or errors in browser DevTools
- [ ] No broken routes or 404 pages
- [ ] No unused imports (ESLint should catch these)
- [ ] No duplicated UI — uses shared components
- [ ] Responsive on mobile (320px), tablet (768px), laptop (1024px), desktop (1920px)
- [ ] Light theme renders correctly
- [ ] Dark theme renders correctly (toggle and verify)
- [ ] Consistent spacing and typography
- [ ] Loading states shown during data fetch
- [ ] Empty states shown when no data
- [ ] Error states handle API failures gracefully
- [ ] Smooth navigation transitions
- [ ] Keyboard accessible (Tab, Enter, Escape work)
- [ ] No performance issues (no unnecessary re-renders in React DevTools)
