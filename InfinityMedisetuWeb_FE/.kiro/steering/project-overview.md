# MediSetu Project Overview

## About
MediSetu (also branded as "Infinity MediSetu") is a clinic management SaaS platform for doctors, receptionists, pharmacists, and lab assistants. It handles appointments, patient records, prescriptions, lab tests, pharmacy inventory, billing, and notifications.

## Tech Stack
- **Framework**: React 19 + TypeScript 5.8
- **Build**: Vite 7
- **UI Library**: HeroUI (formerly NextUI) v2.8
- **Styling**: Tailwind CSS v4 with `@tailwindcss/vite` plugin
- **State**: Redux Toolkit + RTK Query
- **Routing**: React Router v7
- **Forms**: React Hook Form + Zod validation
- **Icons**: react-icons (Feather icons `Fi*`, Lucide `Lu*`, Material `Md*`)
- **Font**: Outfit (Google Fonts)

## Design Tokens (from src/index.css @theme)
- Primary: `#0a6c74`
- Primary Hover: `#46beae`
- Secondary: `#2fae8e`
- Background: `#f9fbfc`
- Danger: `#dc3e57`
- Success: `#128635`

## Project Structure
```
src/
├── components/shared/     — Reusable UI (AppButton, Sidebar, Header, DataTable, etc.)
├── pages/                 — Feature modules (each has components/, hooks/, types)
├── redux/api/             — RTK Query API slices
├── redux/slices/          — Redux state slices
├── routes/                — Centralized route definitions
├── Layouts/               — MainLayout, PatientLayout, etc.
├── hooks/                 — Custom hooks (useFeatureGate, useAuth, useTheme, etc.)
├── constants/             — Icons, images, feature tips
├── services/              — Socket.io, external services
└── utils/                 — Utility functions
```

## Key Conventions
- Pages are in `src/pages/<feature>/` with their own `components/`, `hooks/`, `types.ts`
- API slices live in `src/redux/api/<feature>Api.ts`
- Shared components go in `src/components/shared/`
- Routes are centralized in `src/routes/routes.ts`
- Each page module should separate business logic (hooks) from presentation (components)
