# Phase 1 Build Result

Date: 2026-07-14  
Scope: route type-cycle fix, route Suspense boundary, scanner route lazy loading, scanner-only static import cleanup, and dynamic OpenCV/JScanify loading.

## Summary

Phase 1 succeeded. The main entry bundle dropped from `19,423.08 kB` raw to `8,602.53 kB` raw. OpenCV is no longer bundled into the main entry and is emitted as an async chunk: `assets/opencv-pika68Nu.js`.

The scanner route converted to lazy loading:

- `admin-layout > prescription-notepad-scanner`
- Path preserved: `prescription-notepad-scanner`
- Key preserved: `prescription-notepad-scanner`
- Guard/layout nesting preserved.

A scanner-only static reference in `src/pages/profile/prescriptionTemplates.tsx` was also converted to lazy loading because Vite warned that the scanner route's dynamic import could not split while the same scanner page was statically imported there. No other route groups were lazy-loaded.

## Required Metrics

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

## After Build Chunks

| Chunk | Raw | Gzip | Notes |
| --- | ---: | ---: | --- |
| `assets/index-BihxExPf.js` | 8,602.53 kB | 2,341.03 kB | Main entry |
| `assets/opencv-pika68Nu.js` | 10,790.43 kB | 3,499.43 kB | Async OpenCV chunk |
| `assets/scanner-0jFZSgxl.js` | 21.54 kB | 7.67 kB | Async scanner page chunk |
| `assets/jscanify-DLV68Tuy.js` | 2.75 kB | 1.40 kB | Async JScanify chunk |
| `assets/xlsx-DGuHH-KN.js` | 429.49 kB | 143.07 kB | Existing async chunk |
| `assets/html2canvas.esm-B0tyYwQk.js` | 202.36 kB | 48.04 kB | Existing async chunk |

Generated JavaScript chunks: `11`.

## Build And Check Status

| Check | Result |
| --- | --- |
| `npx tsc -p tsconfig.app.json --noEmit --pretty false` | Passed |
| Focused ESLint on changed TS/TSX files | Passed |
| First sandboxed `npm run build` | Failed with existing `spawn EPERM` Vite/esbuild sandbox issue |
| Elevated `npm run build` after scanner-route patch | Passed |
| Final elevated `npm run build` | Passed |

Final Vite build details:

- Vite build time: `39.55 s`
- Transformed modules: `4,926`
- Main JS: `assets/index-BihxExPf.js`
- Main chunk OpenCV search: no `@techstark`, `opencv-js`, or `opencv` string hit in the main entry file.
- OpenCV async chunk emitted: `assets/opencv-pika68Nu.js`
- Scanner async chunk emitted: `assets/scanner-0jFZSgxl.js`

## Warnings

Still present:

- Two generated CSS optimizer warnings for escaped Tailwind selectors.
- Vite `fs`, `path`, and `crypto` externalization warnings from `@techstark/opencv-js`. These now belong to the async OpenCV chunk build, not the main entry bundle.
- Standard Rollup chunk-size warning because the async OpenCV chunk is larger than `500 kB`.

Resolved:

- The Vite warning that `scanner.tsx` was dynamically imported by routes but also statically imported by `prescriptionTemplates.tsx` is gone.

## Route Verification

Pre-edit and post-edit route-shape counts match:

| Route shape marker | Before | After |
| --- | ---: | ---: |
| `key:` entries | 133 | 133 |
| `path:` entries | 132 | 132 |
| `index:` entries | 2 | 2 |
| `authRequired:` entries | 11 | 11 |

No route paths, route ordering, guards, role permissions, redirects, nested relationships, index routes, wildcard route, or layout route values were intentionally changed.

## Manual Testing Checklist

- Login and logout.
- Public route access: `/`, `/login`, `/signup`, `/switch-to-phone`.
- Protected route redirect to `/login`.
- Authenticated redirect away from guest-only routes.
- Refresh a nested protected URL.
- Sidebar navigation to `prescription-notepad-scanner`.
- Scanner page initial load and loading fallback.
- Scanner camera permission flow.
- Direct image upload and crop editor.
- Phone bridge flow through `/switch-to-phone`.
- Prescription Templates page scanner tab.
- Existing dashboard, profile, lab, pharmacy, patient, and report routes for unchanged eager routes.

