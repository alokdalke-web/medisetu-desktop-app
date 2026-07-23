You are working on the Infinity Medi Setu Electron desktop app — an offline-first
clinic management system. Frontend: React 19 + TypeScript + Vite, HeroUI (Tailwind v4
via @theme tokens), Redux Toolkit + RTK Query, React Hook Form + Zod. Electron main
process: Node.js + better-sqlite3.

STRICT RULES — do not violate these:

1. DO NOT change or refactor existing business logic (patient/appointment/prescription
   repositories, PushSyncEngine sync/retry logic, EventLogRepository, DiscoveryService,
   SyncClient/SyncServer P2P logic). This task is additive UI/IPC work only. If you
   believe existing logic must change to complete a phase, STOP and explain why instead
   of changing it.

2. DO NOT introduce a new library if an equivalent already exists in package.json.
   Already available and MUST be reused:
   - Animation: `framer-motion` (already a dependency — use for all transitions/animations)
   - Icons: `react-icons` (Feather `Fi*`, Lucide `Lu*`, Material `Md*`)
   - UI components: `@heroui/react` (Tooltip, Chip, Card, Modal, Popover, Badge, etc.)
   - Forms: react-hook-form + zod (not needed for this feature, but don't add alternatives)
   Only propose a new npm package if you've confirmed none of the above can do the job,
   and explain why before installing it.

3. FOLLOW the existing design system exactly:
   - Colors via CSS custom properties in `src/index.css` (`@theme`) — Primary `#0a6c74`,
     Secondary `#2fae8e`, Danger, Warning, Success tokens. Never hardcode hex colors.
   - Must look correct in both Light and Dark mode (`.dark` class on `<html>`).
   - Reuse shared components from `src/components/shared/` and `src/components/common/`
     (e.g. `AppButton`, `StatusChip`) instead of building new primitives from scratch.
   - PascalCase components, camelCase hooks/utils.

4. The UI must be genuinely polished — smooth enter/exit transitions (framer-motion),
   no jarring layout shifts, no flash-of-wrong-state on load. This is a production
   feature staff will see every day, not a debug tool.

5. Work only within the stated file scope for each phase. If you need to touch a file
   outside that scope, stop and ask first.

Relevant existing code you'll be extending (read before writing anything):
- `electron/src/main/cluster/DiscoveryService.ts` — peer list, already tracks
  {nodeId, ip, lastSeen}, exposes `getActivePeers()`.
- `electron/src/main/sync/SyncEngine.ts` (PushSyncEngine) — has `getStatus()` returning
  {isOnline, isSyncing, pendingCount, failedCount, hasAuthToken}, and broadcasts
  `push_sync:progress` events to the renderer.
- `electron/ipc/sync.ipc.ts` — existing IPC handlers: `push_sync:status`, `push_sync:trigger`.
- `electron/preload/index.ts` — exposes `window.ipcAPI.pushSync.getStatus()`,
  `window.ipcAPI.pushSync.trigger()`, `window.ipcAPI.sync.onPushProgress(callback)`.
- `src/components/shared/NetworkStatusBanner.tsx` — existing banner, currently returns
  `null` in Electron (`if (isElectron) return null`) — this is the file we're replacing
  the Electron behavior of, NOT the web behavior. Do not change its web-mode behavior.
- `src/components/shared/SyncDebugPanel.tsx` — existing hidden dev panel
  (Ctrl+Shift+S toggle) reading `pushSync.getStatus()` — this is the base we're
  promoting into a real feature, not throwing away.

Decisions already locked in (do not re-litigate, just implement):
- Three connectivity states: "Fully Online" / "LAN Sync Active" (cloud unreachable,
  peers visible) / "Island Mode" (cloud unreachable, no peers visible).
- Offline-allowed features: patient registration, appointment booking, prescription
  creation, add new medicine. Billing/payments stays cloud-only (disabled offline).
- Disabled-offline features are greyed out with a tooltip explaining why — never
  hidden, never a dead click-through.
- Banner is persistent while the state holds (not user-dismissible) — staff should
  never be able to dismiss-and-forget that they're offline.
- Sync detail panel lives behind a persistent icon in the app's top bar (not a secret
  shortcut).
- The LAN node/peer view lives as a section/tab inside the same sync panel (not a
  separate screen) for this version.