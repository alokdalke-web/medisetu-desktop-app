# CLAUDE.md — Frontend (`InfinityMedisetuWeb_FE`)

React 19 + TypeScript + Vite frontend for Medisetu Clinic Management Software.
Stack: Redux Toolkit + RTK Query, react-hook-form + Zod, Socket.io client.

> This is one of two repos under `imsCore/`. In dev, Vite proxies `/api` and
> `/socket.io` to the backend (`../InfinityMedisetu_BE`) on `localhost:5000`.
> The repo-root `../CLAUDE.md` has the cross-repo overview.

## UI work — read these first

Before changing any UI (styling, layout, responsiveness, components), read:
- **`docs/playbook/UI_PLAYBOOK.md`** — start here. A fast-start checklist of the recurring bugs/patterns
  found while reworking `pages/appointment/` (dark-mode slate-inversion trap, redundant `dark:`
  hex, icon-button touch targets/ARIA, re-render scoping, the folder-split pattern) — apply it to
  any screen before diving into the two docs below.
- **`docs/playbook/UI_CONVENTIONS.md`** — the standing rules: design tokens (`bg-surface`, `text-text`,
  `border-line`), how dark mode works (the `.dark` block remaps CSS variables, so no `dark:` hex is
  needed), the responsive device matrix (mobile 360 → 16" laptop → desktop), folder structure,
  reusable primitives, accessibility, and comment hygiene.
- **`docs/playbook/UI_REMEDIATION_LOG.md`** — per-screen fixes written as reusable patterns
  (Symptom → Root cause → Fix → Reusable rule). Scan the "Reusable rule" lines before fixing a
  screen; add a new entry after you fix one.
- **`docs/playbook/PAGE_AUDIT_CHECKLIST.md`** — a literal, checkbox-based checklist for auditing or
  building a list/table + toolbar + stat-card page. Run it against any such page before calling it
  done.

Two hard rules: **this repo has no Prettier** (never run `prettier` — it reflows the whole file
against the codebase's long-line style); and **types go in `src/types/<domain>/`**, not inline in
components.

## Commands

- `npm run dev` — Vite dev server (proxies `/api` and `/socket.io` to `http://localhost:5000`)
- `npm run build` — `tsc -b` then `vite build` (both with `--max-old-space-size=4096`)
- `npm run lint` / `npm run lint:fix`
- `npm run preview` — preview a production build
- No test runner is currently configured.

## Architecture

**State**: Redux Toolkit + RTK Query. Each backend feature has a matching API slice in `src/redux/api/*Api.ts` (e.g. `appointmentApi.ts`, `clinicApi.ts`, `subscriptionApi.ts`). `src/redux/api/apiRoot.ts` aggregates the "core" slices into `allApiSlices`; `src/redux/store.ts` then de-duplicates every API slice (core + a few registered ad hoc, e.g. `labDashboardApi`, `mfaApi`, `prescriptionTemplateApi`) by `reducerPath` before combining reducers and concatenating middleware. **When adding a new API slice, register it in `apiRoot.ts` (or explicitly in `store.ts`) or its reducer/middleware won't be wired.** Build new slices on `baseQueryWithAutoLogout.ts` (the shared base query handling auth-expiry/auto-logout), not raw `fetchBaseQuery`.

**Routing**: `src/routes/AppRoutes.tsx` + `routes.ts` define routes; `AuthRoute.tsx` gates authenticated routes; `Layouts/` holds distinct shells per app area (`MainLayout`, `OnboardingLayout`, `PatientLayout`, `ProfileLayout`).

**Validation**: Zod schemas mirroring backend feature names in `src/schemas/*.ts` (`appointment.ts`, `clinic.ts`, `subscription.ts`, …), generally paired with `react-hook-form` + `@hookform/resolvers`.

**Feature-oriented layout**: `src/pages/` and `src/components/` are subdivided per domain feature (`appointment`, `pharmacy`, `lab`, `medicine`, `prescription`, `subscription`, `reports`, …), matching backend module names — trace a feature end-to-end via the corresponding FE/BE folder pair.

**Real-time**: `src/services/socket.ts` + feature hooks (`useAppointmentRealtime`, `useClinicQueueRealtime`, `usePatientAppointmentRealtime`, `useSocketNotifications`, `useCallAlerts`) wrap Socket.io client events into React state.

**Access/plan gating**: `useFeatureGate`, `useIsFreePlan`, `usePlanInfo`, `LimitationsProvider`, and `src/schemas/access.ts` implement subscription/RBAC UI gating mirroring the backend's subscription/limitation middleware.

**Onboarding/clinic-setup**: `OnboardingContext`, `clinicSetupStatus.ts`, and the `clinic-setup`/`onboarding` page/component folders implement a multi-step guarded setup wizard — see `docs/ONBOARDING_GUARD_IMPLEMENTATION.md`.

**Shared/domain types live under `src/types/`, not next to the API slice.** Simple cross-cutting types are flat files there (`src/types/staffManagement.ts`); anything with more than one file's worth of types gets its own subfolder with a barrel `index.ts` re-exporting the rest (see `src/types/prescription-scanner/{api-types,schema,ui-state}.ts` + `index.ts`). When a new API slice (`src/redux/api/*Api.ts`) needs request/response types, add or extend the matching `src/types/<domain>/` subfolder (e.g. `src/types/doctor/apiTypes.ts`) and `import type { ... } from "../../types/<domain>"` — don't declare them inline in the `*Api.ts` file or in a sibling `*Api.types.ts` file next to it. Most existing `*Api.ts` files predate this convention and still declare their types inline; don't copy that into new code, and prefer moving a file's types out to `src/types/<domain>/` when you touch it.

**No path alias** is configured for `src/` — imports are relative.
