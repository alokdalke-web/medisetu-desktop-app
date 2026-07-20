# Frontend Performance Audit

Date: 2026-07-14  
Project: `D:\MediSetu-1`  
Scope: React, TypeScript, Vite frontend build and runtime performance audit.  
Status: Audit only. No optimization or business-logic changes were applied.

Raw measurements are captured in [`BUILD_BASELINE.md`](BUILD_BASELINE.md).

## A. Executive Summary

The production build succeeds, but the current frontend has a very large initial JavaScript payload and a high-memory build profile. The main production bundle is `18.52 MB` raw, about `5.60 MB` gzip, and contains most application domains because route components are imported eagerly from a central route registry. The end-to-end build took `146.61 s` and peaked at about `3.85 GB` private memory across the process tree.

The largest confirmed bundle issue is scanner code: `@techstark/opencv-js` contributes `10.36 MiB` rendered by itself and is currently pulled into the main application path through eager route imports. Other heavy libraries, including PDF rendering, charts, maps, markdown, and editor code, are also reachable from the initial graph because feature pages are not route-split.

The highest-return optimization is route-level code splitting by domain, followed by lazy-loading scanner/PDF/map/editor features inside those routes. Manual chunks can help caching and chunk organization, but they will not fix the initial payload until eager route imports are removed.

Expected impact from the first optimization pass:

| Area | Current | Realistic target after route split |
| --- | ---: | ---: |
| Main JS raw | `18.52 MB` | under `4-6 MB` |
| Main JS gzip | `5.60 MB` | under `1.5-2.0 MB` |
| Initial OpenCV cost | `10.36 MiB rendered` | `0` on non-scanner routes |
| Initial route graph | all major domains | shell + active route only |
| Build memory | `3.85 GB peak` | lower, but verify after splitting |

## B. Current Measurements

Baseline build:

| Metric | Value |
| --- | ---: |
| Build command | `npm run build` |
| Exit code | `0` |
| End-to-end build time | `146.61 s` |
| Vite reported build time | `45.08 s` |
| Modules transformed | `4,926` |
| Peak private bytes, process tree | `3,845.4 MB` |
| Peak working set, process tree | `3,643.4 MB` |
| Main Vite Node private memory at peak | `3,190.9 MB` |
| esbuild private memory at peak | `592.4 MB` |

Output size:

| Area | Size |
| --- | ---: |
| Total `dist` files | `459` |
| Total `dist` size | `54.87 MB` |
| All `.js` in `dist` | `27.58 MB` |
| All `.css` in `dist` | `2.26 MB` |
| All `.png` in `dist` | `14.91 MB` |
| All `.jpg` in `dist` | `7.86 MB` |
| Copied `dist/tinymce` | `10.51 MB` |
| Source maps | `0` files |

Vite-emitted JS/CSS:

| Type | Count | Raw | Gzip | Brotli |
| --- | ---: | ---: | ---: | ---: |
| JS | `8` | `19,813.2 KiB` | `6,000.5 KiB` | `4,440.2 KiB` |
| CSS | `1` | `613.4 KiB` | `77.1 KiB` | `55.5 KiB` |

Largest emitted chunks:

| File | Raw | Gzip | Brotli |
| --- | ---: | ---: | ---: |
| `assets/index-CyRoxhBh.js` | `18,967.8 KiB` | `5,735.2 KiB` | `4,216.1 KiB` |
| `assets/index-DVotjYR8.css` | `613.4 KiB` | `77.1 KiB` | `55.5 KiB` |
| `assets/xlsx-DGuHH-KN.js` | `419.4 KiB` | `139.0 KiB` | `116.1 KiB` |
| `assets/html2canvas.esm-B0tyYwQk.js` | `197.6 KiB` | `46.4 KiB` | `37.9 KiB` |
| `assets/index.es-DF-xqKTX.js` | `155.7 KiB` | `52.1 KiB` | `45.3 KiB` |

Bundle analyzer summary:

| Metric | Value |
| --- | ---: |
| Bundles | `8` |
| Modules | `3,945` |
| Entry chunks | `1` |
| Static imports | `14,741` |
| Dynamic imports | `15` |
| Rendered size | `30.10 MiB` |
| Gzip size | `8.21 MiB` |
| Brotli size | `6.56 MiB` |

Top rendered packages/modules:

| Package or module | Rendered size | Notes |
| --- | ---: | --- |
| `@techstark/opencv-js/dist/opencv.js` | `10.36 MiB` | Scanner-only library in main graph |
| `xlsx/xlsx.mjs` | `868.56 KiB` | Already dynamically imported in medicine flows |
| `date-fns` | `807.50 KiB` | `664` modules retained |
| `@react-pdf/pdfkit` | `642.02 KiB` | PDF generation stack |
| `recharts` | `632.47 KiB` | Dashboard/charting features |
| `react-dom` | `548.25 KiB` | Expected core dependency |
| `fontkit` | `516.48 KiB` | PDF stack |
| `html2canvas` | `400.72 KiB` | Export/capture stack |
| `@react-pdf/png-js` | `386.16 KiB` | PDF stack |
| `jspdf` | `336.06 KiB` | Report/upload PDF features |
| `motion-dom` | `322.91 KiB` | Animation/UI dependency |
| `@react-google-maps/api` | `292.38 KiB` | Clinic map flows |
| `crypto-js` | `242.49 KiB` | Crypto helpers |
| `@heroui/theme` | `231.00 KiB` | UI/theme styling |

Build warnings:

- CSS optimizer warning for generated selector containing `.bg-slate-50\/70`.
- CSS optimizer warning for `.hover\:bg-gray-50`, treated as an invalid pseudo-class by the optimizer.
- Vite externalized Node built-ins `fs`, `path`, and `crypto` from `@techstark/opencv-js/dist/opencv.js`.
- Vite warned that some chunks are larger than `500 KiB`.

## C. Critical Issues

### 1. Eager route imports put almost the whole app into the initial bundle

Severity: Critical  
Files: `src/routes/routes.ts`, `src/routes/AppRoutes.tsx`

`src/routes/routes.ts` imports about `128` route/layout/page modules up front and defines roughly `134` route entries. `AppRoutes.tsx` then renders `Component ? <Component />`. Because route components are regular static imports, the browser must download and parse code for admin, superadmin, patient, pharmacy, lab, report, scanner, guideline, profile, appointment, and onboarding areas before the user needs most of them.

This is the root cause behind many downstream bundle findings. Heavy libraries are not always globally used, but their pages are globally imported.

Recommendation:

- Move shared route types out of `AppRoutes.tsx` into a separate `routes.types.ts`.
- Convert feature pages to `React.lazy(() => import(...))`.
- Wrap route rendering in `Suspense`.
- Keep only the minimum app shell, auth shell, and common layouts eager.
- Split route declarations by domain, for example `authRoutes`, `adminRoutes`, `patientRoutes`, `labRoutes`, `pharmacyRoutes`, `scannerRoutes`.

Example direction:

```tsx
import { lazy, Suspense } from "react";

const Appointment = lazy(() => import("../pages/appointment/Appointment"));
const Scanner = lazy(() => import("../pages/prescription_notepad_scanner/scanner"));

function RouteElement({ Component }: { Component?: React.ComponentType }) {
  if (!Component) return <Outlet />;

  return (
    <Suspense fallback={<AppLoader />}>
      <Component />
    </Suspense>
  );
}
```

Estimated impact: Very high. This should remove large scanner, PDF, chart, map, markdown, and role-specific admin code from the first route payload.

Risk: Medium. Route guards, nested layouts, redirects, and loading states need careful regression testing.

### 2. OpenCV scanner code is in the initial application graph

Severity: Critical  
Files: `src/routes/routes.ts`, `src/pages/prescription_notepad_scanner/scanner.tsx`, `src/pages/prescription_notepad_scanner/useOpenCV.ts`

Analyzer shows `@techstark/opencv-js/dist/opencv.js` at `10.36 MiB` rendered, `3.34 MiB` gzip, and `2.43 MiB` Brotli. It is imported by scanner code, but the scanner route is eagerly imported from the central route table, so the scanner-only dependency becomes part of the main bundle.

The Vite build also externalizes `fs`, `path`, and `crypto` references from OpenCV, which is another sign this library should be isolated from the standard browser startup path.

Recommendation:

- First lazy-load the scanner route.
- Then lazy-load OpenCV and `jscanify` inside the scanner hook or scanner component.
- Show a scanner-specific loading state while the OpenCV runtime initializes.
- Verify non-scanner routes contain no OpenCV module in the main chunk after the change.

Example direction:

```tsx
const [{ default: jscanify }, cvModule] = await Promise.all([
  import("jscanify/client"),
  import("@techstark/opencv-js"),
]);
```

Estimated impact: Very high. This one change can remove more than half of the current main JS raw size from non-scanner startup.

Risk: Medium. Scanner initialization and browser permission flows must be manually retested.

### 3. PDF/reporting dependencies are reachable from startup

Severity: High  
Files include:

- `src/components/prescription/TestDetailsTab.tsx`
- `src/pages/lab/components/sampleTracking/ResultEntryCard.tsx`
- `src/pages/pharmacy/InvoicePdf.tsx`
- `src/pages/patient/PrescriptionSection.tsx`
- `src/pages/patient/PrescriptionPdf.tsx`
- `src/components/prescription/UploadReportModal.tsx`

The analyzer shows a large PDF/export stack:

- `@react-pdf/pdfkit`: `642.02 KiB`
- `fontkit`: `516.48 KiB`
- `@react-pdf/png-js`: `386.16 KiB`
- `jspdf`: `336.06 KiB`
- `html2canvas`: `400.72 KiB`
- `canvg`: `165.30 KiB`

Some export libraries are already emitted as separate chunks, but route eagerness still makes PDF-capable pages part of the startup graph.

Recommendation:

- Route-split pages that render PDF/export features.
- Lazy-load PDF viewer/export components behind explicit user actions such as "Download", "Print", or opening a report modal.
- Consider a single PDF strategy where feasible. The app currently uses both `@react-pdf/renderer` and `jspdf`/`html2canvas`.

Estimated impact: High for initial parse/evaluation and route-specific load times.

Risk: Medium. PDF output must be visually compared before and after changes.

### 4. Public assets and TinyMCE copied output are large

Severity: High  
Files: `public/assets/images/*`, `public/tinymce/*`, `src/components/prescription-scanner/helpers/edit-html.tsx`

`dist` includes `10.51 MB` copied from `public/tinymce`. Large public images add another `22+ MB` across PNG/JPG output. The largest image is `public/assets/images/wellcome-doctors-img.jpg` at `6.74 MB`, `4096x3162`.

TinyMCE is intentionally referenced from `/app/tinymce` in `edit-html.tsx`, so it is being copied because the app expects a public static TinyMCE installation.

Recommendation:

- Keep TinyMCE static assets only if the editor needs self-hosted assets.
- Convert `import { Editor as TinyMCEEditor } from "tinymce"` to `import type` if it is only used as a type.
- Investigate whether TinyMCE can be loaded only on editor routes and whether unused skins/plugins/languages can be excluded.
- Compress and resize large public images to actual display dimensions.
- Prefer WebP/AVIF variants where browser support and product requirements allow it.

Estimated impact: High for deploy artifact size, cold cache loading, and CDN transfer.

Risk: Low to Medium. Image optimization is visually testable; TinyMCE asset trimming needs editor regression testing.

### 5. All RTK Query API slices are imported into the store

Severity: High, long-term architectural item  
Files: `src/redux/store.ts`, `src/redux/api/apiRoot.ts`

The store imports a central list of API slices. The scan found `47` `createApi(` instances. All reducers and middleware are assembled at startup, which means endpoint definitions for many domains are parsed before they are needed.

Recommendation:

- Long term, consolidate toward one base API and `injectEndpoints` from feature modules.
- Keep only the base API reducer/middleware in the store.
- Let lazy-loaded feature routes import their endpoint definitions.
- Avoid a broad `apiRoot.ts` that imports every feature API up front.

Estimated impact: Medium to High. This will reduce startup parse work and make future code splitting more effective.

Risk: High. This is cross-cutting and should be done after route splitting, with focused tests around caching, invalidation tags, auth refresh, and optimistic updates.

## D. Optimization Opportunities

| Priority | Area | Current finding | Recommendation | Estimated effect | Risk |
| --- | --- | --- | --- | --- | --- |
| P0 | Route loading | All major page modules are imported in `routes.ts` | Add route-level `React.lazy` and domain route files | Very high | Medium |
| P0 | Scanner | OpenCV is `10.36 MiB` rendered in the main graph | Lazy-load scanner route and OpenCV runtime | Very high | Medium |
| P1 | PDF/export | PDF stacks are reachable from startup | Lazy-load report/PDF components and action-only exporters | High | Medium |
| P1 | Public media | `dist` contains `14.91 MB` PNG and `7.86 MB` JPG | Resize/compress large images, add modern formats | High | Low |
| P1 | TinyMCE | `dist/tinymce` is `10.51 MB` | Trim self-hosted editor assets or lazy-load editor bundle/assets | High | Medium |
| P1 | API slices | `47` `createApi` instances imported by store graph | Move toward base API + feature `injectEndpoints` | Medium/High | High |
| P2 | CSS | One Vite CSS file is `613.4 KiB`; optimizer warnings exist | Fix invalid selectors and audit Tailwind/HeroUI content scanning | Medium | Medium |
| P2 | Date/chart libraries | `date-fns` retains `664` modules; both chart stacks exist | Review import style and consolidate where practical | Medium | Low/Medium |
| P2 | Shell data fetching | Repeated shell queries in `App`, layout, sidebar, header | Centralize user/clinic/role data and narrow `skip` logic | Medium | Medium |
| P2 | Circular imports | Six cycles found, mostly type cycles | Move shared types to `*.types.ts` files | Low/Medium | Low |
| P3 | Production logs | Many `console.*`, TODO, temporary comments | Gate logs or remove debug noise | Low | Low |

## E. Quick Wins

These are the safest first changes after this audit:

1. Add route-level lazy loading for scanner, reports, lab, pharmacy, patient, guidelines, profile, and admin-only pages.
2. Lazy-load `@techstark/opencv-js` and `jscanify` inside scanner code.
3. Compress `wellcome-doctors-img.jpg`, `login-doctor.png`, `tips-success-illustration.png`, `approval-waiting-illustration.png`, `doctor.png`, `onboarding_img.png`, and `Doc_Steps.png`.
4. Convert TinyMCE imports that are only used as types to `import type`.
5. Remove verified unused direct dependencies after a clean build.
6. Change Redux DevTools configuration to be environment-gated.
7. Fix the CSS optimizer warnings so the generated CSS is predictable.

## F. Long-Term Improvements

1. Refactor API slices to a single base API with route/feature-level `injectEndpoints`.
2. Split route declarations by domain and ownership area.
3. Create explicit async boundaries for scanner, PDF, map, markdown, editor, and chart features.
4. Add a repeatable bundle budget check to CI.
5. Track build timing, peak memory, main chunk gzip, and `dist` size over time.
6. Consolidate overlapping libraries where product behavior allows it.

## G. Unused Dependency And File Candidates

Verified direct dependency candidates with no source imports found:

| Package | Finding | Recommendation |
| --- | --- | --- |
| `@adi-prasetyo/react-joyride` | No source import found; app appears to use `driver.js` for tours | Remove if not used by hidden tooling |
| `html2pdf.js` | No source import found | Remove if confirmed unused |
| `react-color` | No source import found | Remove if confirmed unused |
| `react-zxing` | No source import found | Remove if confirmed unused |
| `@types/react-color` | No source import found; type package is in dependencies | Remove with `react-color`, or move to devDependencies only if still needed |

Dependency notes:

- `react-is` had no direct source import, but it can be a peer/runtime dependency for charting libraries. Do not remove it without `npm ls react-is` and a production build.
- `@tailwindcss/vite` and `tailwindcss` are build-time dependencies. Moving them to `devDependencies` will not reduce the client bundle, but it will clean the production install surface.
- `xlsx` is already dynamically imported in medicine flows, which is good. Keep that pattern.
- `date-fns` appears large in the analyzer. Try subpath imports and verify with the analyzer; if tree shaking should already handle the current version, investigate why `664` modules are retained.

Asset candidates with no source filename hit:

| Asset | Size | Dimensions | Recommendation |
| --- | ---: | ---: | --- |
| `public/assets/images/login-doctor.png` | `2,330.7 KiB` | `1536x1024` | Confirm no external reference, then remove or optimize |
| `public/assets/images/approval-waiting-illustration.png` | `2,149.9 KiB` | `1536x1024` | Confirm no external reference, then remove or optimize |
| `public/assets/images/onboarding_img.png` | `1,355.7 KiB` | `752x1187` | Confirm no external reference, then remove or optimize |
| `public/assets/images/paymenthistory.jpg` | `776.4 KiB` | `1041x1024` | Confirm no external reference, then remove or optimize |
| `public/assets/images/login-bg-shape.png` | `504.2 KiB` | `825x982` | Confirm no external reference, then remove or optimize |
| `public/assets/images/login-bg-texture.jpg` | `251.5 KiB` | `4096x2389` | Confirm no external reference, then remove or optimize |
| `src/assets/react.svg` | `4.0 KiB` | SVG | Remove if it is still unused |

Important: assets under `public` can be referenced by server-rendered content, CMS content, emails, external links, or literal URLs not discoverable by source filename search. Treat these as candidates until product references are checked.

## H. Suggested Implementation Order

### Phase 1: Measure and protect the baseline

Already completed in this audit:

- Run production build.
- Capture build time, memory, emitted chunks, gzip/Brotli sizes, and `dist` size.
- Generate analyzer output without committing analyzer config.
- Record findings in `BUILD_BASELINE.md`.

Next recommended guardrails:

- Add a local script or CI job for bundle size reporting.
- Track main chunk raw/gzip/Brotli, total JS, total CSS, total `dist`, and build time.

### Phase 2: Route-level code splitting

Start with the largest isolated domains:

1. Scanner routes.
2. Reports and PDF-heavy routes.
3. Lab/pharmacy/patient dashboards.
4. Admin and superadmin-only areas.
5. Guidelines/markdown pages.

Verification:

- Build successfully.
- Confirm OpenCV and PDF stacks are absent from the main chunk.
- Manually navigate each lazy route and verify loading states, auth redirects, nested routes, and error states.

### Phase 3: Heavy feature lazy-loading

After routes are lazy:

- Lazy-load OpenCV inside scanner code.
- Lazy-load PDF export components on user action.
- Lazy-load map components when clinic forms/details require maps.
- Lazy-load markdown renderer on guidelines pages.
- Lazy-load editor/TinyMCE only when entering editor workflows.

Verification:

- Use analyzer to confirm feature chunks are isolated.
- Test feature-specific flows, not only app startup.

### Phase 4: Asset and CSS cleanup

- Optimize the largest images.
- Remove confirmed unused public assets.
- Investigate TinyMCE static folder requirements.
- Fix CSS optimizer warnings.
- Review Tailwind/HeroUI scanning scope.

Verification:

- Visual diff important pages.
- Confirm `dist` copied asset size drops.
- Confirm CSS warnings disappear.

### Phase 5: Store/API architecture

- Introduce a base RTK Query API.
- Move endpoint registration to feature modules through `injectEndpoints`.
- Remove broad all-domain API imports from the startup store graph.

Verification:

- Regression test auth, cache invalidation, optimistic updates, polling/refetch behavior, and role-specific screens.

## I. Before/After Benchmark Plan

Run the same measurements before and after each phase:

1. `npm run build`
2. Capture end-to-end build time and Vite reported time.
3. Capture peak private bytes and working set for the process tree.
4. Record transformed module count.
5. Measure `dist` total size and file count.
6. Measure Vite-emitted JS/CSS raw, gzip, and Brotli sizes.
7. Run analyzer and capture:
   - main chunk raw/gzip/Brotli
   - top packages
   - OpenCV/PDF/map/chart/editor chunk placement
   - duplicate modules
8. Smoke test:
   - public/auth startup
   - admin dashboard
   - patient flow
   - scanner route
   - PDF/export flow
   - map/clinic flow
   - TinyMCE/editor flow

Suggested budgets after Phase 2 and Phase 3:

| Metric | Budget |
| --- | ---: |
| Main JS gzip | under `2.0 MB` |
| Main JS raw | under `6.0 MB` |
| Initial OpenCV in main chunk | `0` |
| Initial PDF stack in main chunk | `0` unless route requires it |
| CSS gzip | under `100 KiB` |
| Total `dist` size | trend downward; set final budget after asset review |

## Additional Detailed Findings

### Route-Level Code Splitting

Confirmed files:

- `src/routes/routes.ts` imports nearly all page modules.
- `src/routes/AppRoutes.tsx` imports `routes` and exports the `AppRoute` type.
- `src/routes/routes.ts` imports `type { AppRoute } from "./AppRoutes"`, creating a route/type cycle.

Recommended structure:

- `src/routes/routes.types.ts`: route type definitions only.
- `src/routes/domain/authRoutes.tsx`
- `src/routes/domain/adminRoutes.tsx`
- `src/routes/domain/patientRoutes.tsx`
- `src/routes/domain/scannerRoutes.tsx`
- `src/routes/routes.ts`: small composition file.

This makes route ownership clearer and gives lazy imports natural domain boundaries.

### Dependency Review

Heavy dependencies should be classified by when users actually need them:

| Dependency area | Current concern | Preferred loading model |
| --- | --- | --- |
| Scanner: `@techstark/opencv-js`, `jscanify` | Very large and scanner-only | Lazy route + lazy runtime import |
| PDF: `@react-pdf/renderer`, `jspdf`, `html2canvas` | Large export stack | Lazy route + lazy action import |
| Maps: `@react-google-maps/api` | Clinic/map-specific | Lazy map component |
| Markdown: `react-markdown`, `remark-gfm` | Guidelines-specific | Lazy guidelines route |
| Charts: `recharts`, `chart.js`, `react-chartjs-2` | Multiple chart stacks | Route split first, consolidate later |
| Dates: `date-fns`, `dayjs` | Multiple date libraries | Verify import style, consolidate where practical |
| Tours: `driver.js`, unused Joyride dependency | One tour library appears unused | Keep one library |

### Asset Review

Largest image assets:

| Asset | Size | Dimensions | Notes |
| --- | ---: | ---: | --- |
| `public/assets/images/wellcome-doctors-img.jpg` | `6,899.7 KiB` | `4096x3162` | Very large for web delivery |
| `public/assets/images/login-doctor.png` | `2,330.7 KiB` | `1536x1024` | No source filename hit found |
| `public/assets/images/tips-success-illustration.png` | `2,194.2 KiB` | `1536x1024` | Optimize |
| `public/assets/images/approval-waiting-illustration.png` | `2,149.9 KiB` | `1536x1024` | No source filename hit found |
| `public/assets/images/doctor.png` | `1,587.2 KiB` | `752x1337` | Optimize |
| `public/assets/images/onboarding_img.png` | `1,355.7 KiB` | `752x1187` | No source filename hit found |
| `public/assets/images/Doc_Steps.png` | `1,235.7 KiB` | `941x1162` | Optimize |
| `public/assets/images/doc-img.png` | `978.0 KiB` | `1461x1394` | Optimize |
| `public/assets/images/login-bg-border.png` | `882.1 KiB` | `826x982` | No active source hit found; commented in login code |
| `public/assets/images/paymenthistory.jpg` | `776.4 KiB` | `1041x1024` | No source filename hit found |

Recommended asset approach:

- Resize each image to its maximum rendered CSS size plus a retina variant if needed.
- Use WebP/AVIF for photographic or illustration assets.
- Keep original master assets outside `public` if they are not directly served.
- Prefer imported assets for bundler-managed images when cache hashing and dead-code elimination are useful.

### React Runtime Review

Potential startup/render costs:

- `App.tsx` performs app-wide clinic/tour logic and imports tour functionality in the root shell.
- `MainLayout.tsx`, `Sidebar.tsx`, and `Header.tsx` repeat user/clinic/doctor queries.
- `LimitationsProvider` runs at app-provider level.
- RTK Query dedupes identical endpoint/arg subscriptions, but duplicated shell subscriptions still increase render wiring and can trigger role-specific work earlier than needed.

Recommendations:

- Move tour library loading behind an explicit "start tour" path or a narrow post-login condition.
- Centralize shell user/clinic/role data in one place and pass derived state down, or use selectors consistently.
- Tighten `skip` conditions so role-specific queries do not mount until the role and clinic context are known.
- Memoize derived sidebar/header data if profiling shows repeated expensive computation.

### Build Configuration Review

Current observations:

- `vite.config.ts` uses React and Tailwind plugins.
- `base` is `/app/`.
- `build.emptyOutDir` is enabled.
- No manual chunks are configured.
- Source maps are not emitted.
- The build script already gives TypeScript and Vite `4096 MB` Node heap.

Recommendations:

- Do not only raise `chunkSizeWarningLimit`; fix the main chunk.
- Add manual chunks after route splitting, not before, so chunks reflect real async boundaries.
- Consider chunks such as `vendor-react`, `vendor-ui`, `vendor-charts`, `vendor-pdf`, `vendor-opencv`, `vendor-editor`, and `vendor-maps` only after verifying they do not accidentally become initial chunks.
- Keep source maps disabled for production unless they are uploaded privately to an error monitoring service.
- Split `typecheck` and `vite build` into separate measurable scripts for easier profiling.

### CSS Review

Current observations:

- The emitted application CSS is `613.4 KiB` raw.
- Tailwind v4 and HeroUI are used.
- `index.css` includes broad HeroUI theme scanning from `node_modules`.
- CSS optimizer warnings indicate some generated selectors are malformed or are being parsed unexpectedly.

Recommendations:

- Fix the selectors that trigger optimizer warnings.
- Audit arbitrary class names and escaped selectors around `bg-slate-50/70` and `hover:bg-gray-50`.
- Confirm Tailwind content/source scanning is as narrow as the project allows.
- Keep checking CSS gzip and raw size after route-level code splitting; global Tailwind CSS may stay as a single file unless CSS is intentionally modularized.

### Circular Dependency Review

Detected cycles:

| Cycle | Recommendation |
| --- | --- |
| `src/redux/store.ts -> src/redux/slices/clinicSetupSlice.ts -> src/redux/store.ts` | Move `RootState`-dependent selectors or types out of the slice file |
| `src/redux/store.ts -> src/redux/api/mfaApi.ts -> src/redux/store.ts` | Use an app types file rather than importing from store inside API modules |
| `ClinicAvailability.tsx -> LeavesInlineEditor.tsx -> ClinicAvailability.tsx` | Move shared `DateAvailabilityItem` type to a separate file |
| `ClinicAvailability.tsx -> LeavesList.tsx -> ClinicAvailability.tsx` | Move shared types/helpers out of component files |
| `ClinicDetails.tsx -> AddClinicModal.tsx -> ClinicDetails.tsx` | Move `ClinicFormValues` to a separate type file |
| `AppRoutes.tsx -> routes.ts -> AppRoutes.tsx` | Move `AppRoute` type to `routes.types.ts` |

These cycles are not necessarily runtime bugs today, but they make lazy loading and tree shaking harder to reason about.

### Production-Code Quality

The audit found many `console.log`, `console.error`, TODO, and temporary comments in source files. Examples include app tour behavior, dashboard initialization, prescription workspace debugging, socket logs, onboarding logs, and reports pages.

Recommendations:

- Remove debug logs before optimization work is benchmarked.
- Keep intentional error reporting, but route it through a small logger that can be environment-gated.
- Replace temporary behavior comments with tracked tasks or remove the temporary paths if they are no longer needed.

## Final Recommendation

Do not start with low-level micro-optimizations. The main performance issue is structural: too many routes and feature dependencies are statically imported into the initial application graph.

The recommended first implementation pass is:

1. Move route types out of `AppRoutes.tsx`.
2. Convert the largest route domains to lazy imports.
3. Isolate scanner/OpenCV behind a scanner-only async boundary.
4. Rebuild and compare against `BUILD_BASELINE.md`.

Only after that should the project tune manual chunks, API-slice injection, asset cleanup, and dependency consolidation.

## Phase 1 Implementation Results

Date: 2026-07-14  
Result: completed and rebuilt successfully.

Files changed:

- `src/routes/routes.types.ts`
- `src/routes/AppRoutes.tsx`
- `src/routes/routes.ts`
- `src/pages/prescription_notepad_scanner/useOpenCV.ts`
- `src/pages/prescription_notepad_scanner/scanner.tsx`
- `src/pages/prescription_notepad_scanner/DocumentScanner.tsx`
- `src/pages/prescription_notepad_scanner/CameraScanner.tsx`
- `src/pages/prescription_notepad_scanner/switchToPhone.tsx`
- `src/pages/profile/prescriptionTemplates.tsx`
- `FRONTEND_PERFORMANCE_AUDIT.md`
- `PHASE_1_BUILD_RESULT.md`

Routes converted to lazy loading:

- `admin-layout > prescription-notepad-scanner`
- Path preserved: `prescription-notepad-scanner`
- Key preserved: `prescription-notepad-scanner`

No other route groups were lazy-loaded in this phase. A scanner-only static component reference inside `src/pages/profile/prescriptionTemplates.tsx` was also converted to lazy loading because Vite reported that the route-level scanner dynamic import could not split while the same scanner page was statically imported there.

Heavy libraries dynamically imported:

- `@techstark/opencv-js`
- `jscanify/client`

Build errors encountered:

- The first sandboxed `npm run build` failed with the existing Vite/esbuild `spawn EPERM` sandbox issue.
- The same build succeeded when rerun with escalation.
- TypeScript and focused ESLint passed after the code changes.

Before/after measurements:

| Metric | Before | After | Improvement |
| --- | ---: | ---: | ---: |
| Main JS raw | 19,423.08 kB | 8,602.53 kB | 10,820.55 kB smaller (55.71%) |
| Main JS gzip | 5,858.18 kB | 2,341.03 kB | 3,517.15 kB smaller (60.04%) |
| CSS raw | 628.09 kB | 628.09 kB | 0.00 kB |
| CSS gzip | 80.57 kB | 80.57 kB | 0.00 kB |
| Build time | 39.37 s | 39.55 s | 0.18 s slower |
| Transformed modules | 4,926 | 4,926 | 0 |
| Generated JS chunks | 8 | 11 | +3 async chunks |
| OpenCV in initial bundle | Yes | No | Removed from main entry |

After-build chunks:

- Main entry: `assets/index-BihxExPf.js`, `8,602.53 kB` raw, `2,341.03 kB` gzip.
- Async OpenCV chunk: `assets/opencv-pika68Nu.js`, `10,790.43 kB` raw, `3,499.43 kB` gzip.
- Async scanner page chunk: `assets/scanner-0jFZSgxl.js`, `21.54 kB` raw, `7.67 kB` gzip.
- Async JScanify chunk: `assets/jscanify-DLV68Tuy.js`, `2.75 kB` raw, `1.40 kB` gzip.

OpenCV status:

- OpenCV was removed from the initial bundle.
- OpenCV is emitted as an async chunk.
- The final main entry search found no `@techstark`, `opencv-js`, or `opencv` string hit in `assets/index-BihxExPf.js`.
- Vite still prints `fs`, `path`, and `crypto` externalization warnings while building the async OpenCV chunk.

Route verification:

| Route shape marker | Before | After |
| --- | ---: | ---: |
| `key:` entries | 133 | 133 |
| `path:` entries | 132 | 132 |
| `index:` entries | 2 | 2 |
| `authRequired:` entries | 11 | 11 |

Remaining optimization opportunities:

- Lazy-load PDF/report-heavy route groups.
- Lazy-load lab, pharmacy, patient, admin, profile, and guidelines route groups in separate passes.
- Address CSS optimizer warnings.
- Optimize large public image assets.
- Consider RTK Query endpoint injection after route-level splitting is stable.
