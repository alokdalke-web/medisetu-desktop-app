# Implementation Plan: Plan Limitations Integration

## Overview

Integrate the backend plan limitations API into the MediSetu frontend using RTK Query. The implementation creates a dedicated API slice, exposes `useFeatureGate` and `usePlanInfo` hooks, mounts a provider for startup fetch, and wires cross-slice invalidation so limits refresh on plan/user changes.

## Tasks

- [x] 1. Create TypeScript type definitions
  - [x] 1.1 Create `src/redux/api/limitationsApi.types.ts` with all type definitions
    - Define `FeatureKey` union type with all 11 known feature keys
    - Define `FeatureLimit` interface with featureKey, description, enabled, limitValue, isUnlimited, currentUsage, remaining
    - Define `PlanInfo` interface with planId and planSlug
    - Define `LimitationsOverviewResponse` interface with plan and limits array
    - Define `FeatureStatus` union type: "enabled" | "disabled" | "limit_reached"
    - Define `FeatureGateResult` interface with status, description, limitValue, currentUsage, remaining, isLoading
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 2. Create the limitationsApi RTK Query slice
  - [x] 2.1 Create `src/redux/api/limitationsApi.ts` with the API slice
    - Import `createApi` from `@reduxjs/toolkit/query/react`
    - Import `baseQueryWithAutoLogout` from `./baseQueryWithAutoLogout`
    - Import types from `./limitationsApi.types`
    - Set `reducerPath` to `"limitationsApi"`
    - Set `tagTypes` to `["Limitations"]`
    - Set `keepUnusedDataFor` to `Number.MAX_SAFE_INTEGER`
    - Define `getLimitationsOverview` query endpoint for `GET /users/limitations/overview`
    - Add `transformResponse` to unwrap the `data` field from the API envelope
    - Add `providesTags: ["Limitations"]`
    - Export `useGetLimitationsOverviewQuery` hook
    - _Requirements: 1.1, 1.2, 1.3, 6.4_

- [x] 3. Register the limitationsApi slice in the Redux store
  - [x] 3.1 Add `limitationsApi` import and entry to `src/redux/api/apiRoot.ts`
    - Import `limitationsApi` from `./limitationsApi`
    - Add `limitationsApi` to the `allApiSlices` array
    - _Requirements: 1.2, 6.4_

- [x] 4. Implement the useFeatureGate hook
  - [x] 4.1 Create `src/hooks/useFeatureGate.ts`
    - Export the pure `deriveFeatureStatus` function that maps (enabled, isUnlimited, remaining) → FeatureStatus
    - Implement the truth table: disabled if !enabled; enabled if isUnlimited; limit_reached if remaining <= 0; enabled otherwise
    - Export the `useFeatureGate` hook that accepts a `FeatureKey` parameter
    - Use `useGetLimitationsOverviewQuery` with `selectFromResult` for granular subscriptions
    - Return `FeatureGateResult` with loading/disabled fallback when data is unavailable
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 5.1, 5.2, 6.1_

  - [ ]* 4.2 Write property test for deriveFeatureStatus — disabled features
    - **Property 1: Disabled feature derivation**
    - Generate random FeatureLimit objects with `enabled=false` and arbitrary other fields
    - Assert `deriveFeatureStatus` always returns `"disabled"`
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 4.3 Write property test for deriveFeatureStatus — limit reached
    - **Property 2: Limit-reached feature derivation**
    - Generate random FeatureLimit objects with `enabled=true`, `isUnlimited=false`, `remaining<=0`
    - Assert `deriveFeatureStatus` always returns `"limit_reached"`
    - **Validates: Requirements 4.1, 4.2**

  - [ ]* 4.4 Write property test for deriveFeatureStatus — enabled features
    - **Property 3: Enabled feature derivation**
    - Generate random FeatureLimit objects with `enabled=true` and either `isUnlimited=true` or `remaining>0` or `remaining=null`
    - Assert `deriveFeatureStatus` always returns `"enabled"`
    - **Validates: Requirements 5.1, 5.2**

- [x] 5. Implement the usePlanInfo hook
  - [x] 5.1 Create `src/hooks/usePlanInfo.ts`
    - Import `useGetLimitationsOverviewQuery` from the limitationsApi slice
    - Use `selectFromResult` to extract only the `plan` object
    - Return `{ plan: PlanInfo | null; isLoading: boolean }`
    - _Requirements: 7.1, 7.2_

- [x] 6. Checkpoint - Verify core implementation
  - Ensure all files compile without TypeScript errors, ask the user if questions arise.

- [x] 7. Create the LimitationsProvider component and mount it in the app
  - [x] 7.1 Create `src/components/LimitationsProvider.tsx`
    - Import `useGetLimitationsOverviewQuery` from the limitationsApi slice
    - Import `useAuth` from `../hooks/useAuth`
    - Use `skip: !isAuthenticated` to prevent fetching when not logged in
    - Render children passthrough (provider renders nothing itself)
    - _Requirements: 1.1, 1.5_

  - [x] 7.2 Mount `LimitationsProvider` in `src/App.tsx`
    - Wrap the app content (inside the authenticated boundary) with `<LimitationsProvider>`
    - Ensure it mounts after auth state is available but before feature-gated components render
    - _Requirements: 1.1, 1.5_

- [x] 8. Add cross-slice invalidation to existing mutations
  - [x] 8.1 Add limitations invalidation to `subscriptionApi.subscribe` mutation
    - Import `limitationsApi` in `src/redux/api/subscriptionApi.ts`
    - In the `subscribe` mutation's `onQueryStarted`, dispatch `limitationsApi.util.invalidateTags(["Limitations"])` after `queryFulfilled`
    - _Requirements: 2.1, 2.4_

  - [x] 8.2 Add limitations invalidation to `subscriptionApi.initialSubscribe` mutation
    - In the `initialSubscribe` mutation's `onQueryStarted`, dispatch `limitationsApi.util.invalidateTags(["Limitations"])` after `queryFulfilled`
    - _Requirements: 2.1, 2.4_

  - [x] 8.3 Add limitations invalidation to `subscriptionApi.verifyRazorpayPayment` mutation
    - In the `verifyRazorpayPayment` mutation's `onQueryStarted`, dispatch `limitationsApi.util.invalidateTags(["Limitations"])` after `queryFulfilled`
    - _Requirements: 2.1, 2.4_

  - [x] 8.4 Add limitations invalidation to `authApi.addUser` mutation
    - Import `limitationsApi` in `src/redux/api/authApi.ts`
    - Add `onQueryStarted` to the `addUser` mutation that dispatches `limitationsApi.util.invalidateTags(["Limitations"])` after `queryFulfilled`
    - This covers doctor and receptionist account creation
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 8.5 Add limitations invalidation to `usersApi.updateUser` mutation
    - Import `limitationsApi` in `src/redux/api/usersApi.ts`
    - Add `onQueryStarted` to the `updateUser` mutation that dispatches `limitationsApi.util.invalidateTags(["Limitations"])` after `queryFulfilled`
    - This covers status changes (deactivation/removal) of doctor and receptionist accounts
    - _Requirements: 2.2, 2.3, 2.4_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all files compile without TypeScript errors, verify the app builds successfully with `tsc -b && vite build`, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The design uses TypeScript throughout — all implementations follow the design's code patterns
- Property tests target the pure `deriveFeatureStatus` function using fast-check
- Cross-slice invalidation uses RTK Query's `util.invalidateTags` pattern already established in the codebase
- The `LimitationsProvider` pattern mirrors the existing `useGetAllClinicsQuery` skip pattern in App.tsx
