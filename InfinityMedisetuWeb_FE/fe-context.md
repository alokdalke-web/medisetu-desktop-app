# Infinity MediSetu - Frontend Context & Architecture

This document provides a comprehensive overview of the Infinity MediSetu frontend architecture, technology stack, design system, and key flows. It is synthesized from the core steering documentation.

## 1. Project Overview
**Infinity MediSetu** is a clinic management SaaS platform designed for doctors, receptionists, pharmacists, and lab assiA\stants. It manages appointments, patient records, prescriptions, lab tests, pharmacy inventory, billing, and notifications.

## 2. Technology Stack
- **Framework**: React 19 + TypeScript 5.8
- **Build Tool**: Vite 7
- **UI Library**: HeroUI (formerly NextUI) v2.8
- **Styling**: Tailwind CSS v4 (configured via `@theme` in `src/index.css`)
- **State Management**: Redux Toolkit + RTK Query
- **Routing**: React Router v7
- **Forms & Validation**: React Hook Form + Zod
- **Icons**: `react-icons` (Feather `Fi*`, Lucide `Lu*`, Material `Md*`)
- **Typography**: Outfit (Google Fonts)

## 3. Project Structure
```text
src/
├── assets/              # Static assets
├── components/          
│   ├── common/          # Core reusable primitives (Table, Loader)
│   ├── shared/          # Domain-aware shared components (Sidebar, AppButton, InputField)
│   └── [feature]/       # Feature-specific shared components
├── constants/           # Static data and icon paths
├── hooks/               # Custom hooks (e.g., useTheme, useAuth)
├── Layouts/             # Layout wrappers (MainLayout, OnboardingLayout, etc.)
├── pages/               # Page components organized by feature module
├── redux/               # RTK Query API slices and Redux state slices
├── routes/              # Centralized route definitions
├── schemas/             # Zod validation schemas
├── services/            # External services (e.g., Socket.io)
└── utils/               # Pure utility functions
```

## 4. Design System & Theming
- **Color Tokens**: Managed via CSS custom properties in `src/index.css` under `@theme`. Key colors include Primary (`#0a6c74`), Secondary (`#2fae8e`), Background (`#f9fbfc`), Danger, Success, Warning.
- **Theme Support**: Implemented via `useTheme.ts` saving to localStorage (`"medisetu-theme"`). Utilizes the `.dark` class on the `<html>` element. All UI work must be verified in both Light and Dark modes.
- **Responsive Design**: Mobile-first approach using standard Tailwind breakpoints. Max content width for large screens is constrained to `1600px`.
- **Shared Components**: Mandatory reuse of components located in `src/components/shared/` or `common/` (e.g., `AppButton`, `InputField`, `CommonTable`, `StatusChip`). Avoid building custom UI if a shared component exists.

## 5. Forms & Tables Standards
- **Forms**: Strictly rely on React Hook Form + Zod. Use shared input fields with inline validation errors and consistent spacing.
- **Tables**: Use `CommonTable` for full-featured tables (handles pagination, loading, empty states, and errors) or `DataTable` for simpler needs. Tables must support horizontal scrolling on mobile.

## 6. Key Workflows: Clinic Onboarding
The onboarding process is orchestrated by `src/pages/dashboard/NoClinicDash.tsx` and uses `OnboardingLayout.tsx` (no sidebar, split panel design).

### User Flows
1. **Admin/Clinic Owner Flow**:
   - Profile ➔ Clinic Details ➔ Subscription ➔ Verification
   - Full clinic setup, API progress tracking is enabled.
2. **Doctor-Only Flow**:
   - Profile ➔ Services & Pricing ➔ Availability ➔ Subscription ➔ Verification
   - Skips Clinic setup (joins existing clinic). Skips backend onboarding progress tracking to avoid 404s.

### Architecture & Rules
- **State Management**: Onboarding progress is strictly backend-driven (except for Doctors where session storage may be used). Rely on `currentStep` and `onboardingStatus` from the API.
- **Guidebook**: Features an interactive 9-step tour powered by Driver.js (`OnboardingTour.tsx`) to assist users.
- **Verification**: Submitting the form sets an `approvalRequestSent` flag, placing the user in a "Pending" verification screen which polls every 30 seconds for admin approval.

## 7. Code Quality & Performance Rules
- **Performance**: Use `React.lazy()` for page components. Prefer RTK Query for server state. Memoize expensive operations and use stable callbacks.
- **Naming**: PascalCase for components, camelCase for hooks/utils. Feature-specific API slices must have the `Api` suffix (e.g., `clinicApi.ts`).
- **Accessibility**: Ensure semantic HTML, proper ARIA labels, full keyboard navigation, and WCAG AA compliant color contrast.
