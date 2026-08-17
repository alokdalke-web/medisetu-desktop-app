# Implementation Plan: Subscription Module Update

## Overview

Migrate subscription, limitations, and plan-limits API slices to use the new `/subscription/` route prefix, introduce the add-on system (purchase, verify, view, cancel), update the limitations type structure (`baseLimit`/`addOnLimit`/`totalLimit`), decompose the monolithic Subscription page into reusable components, extract shared utilities, and remove dead code. All implementation is in TypeScript using RTK Query and React.

## Tasks

- [x] 1. Update type definitions and shared utilities
  - [x] 1.1 Update FeatureLimit and FeatureGateResult types in `limitationsApi.types.ts`
    - Replace `limitValue` with `baseLimit`, `addOnLimit`, `totalLimit` fields
    - Remove `isUnlimited` field
    - Update `FeatureGateResult` to expose `totalLimit` instead of `limitValue`
    - Ensure `FeatureKey` is the single canonical definition exported from this file
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 6.3_

  - [x] 1.2 Add add-on type definitions to `subscriptionApi.ts`
    - Add `BillingCycle`, `AddOn`, `AvailableAddonsResponse`, `PurchaseAddonRequest`, `PurchaseAddonResponse`, `VerifyAddonPurchaseRequest`, `VerifyAddonPurchaseResponse`, `MyAddOn`, `MyAddonsResponse` types
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 1.3 Create shared utility file `src/utils/subscriptionHelpers.ts`
    - Extract `safeFormatMoney`, `calculatePriceBreakdown`, `generateInvoiceHTML` from `Subscription.tsx`
    - Export them for use by page and child components
    - _Requirements: 5.7_

  - [x] 1.4 Update Razorpay utility `src/utils/razorpay.ts`
    - Update `RazorpayOptions` interface with `description` as required, `planId`/`planName` as optional, add `addOnId` optional field
    - Update `PaymentResult` interface
    - Ensure script load timeout of 10 seconds
    - Handle dismiss, initialization errors, and success cases per design
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [x] 2. Migrate API slices to new route prefix
  - [x] 2.1 Migrate `subscriptionApi.ts` endpoints to `/subscription/` prefix
    - Update `getSubscriptionPlans`, `createSubscriptionPlan`, `updateSubscriptionPlan`, `deleteSubscriptionPlan` to use `/subscription/plans`
    - Update `subscribe` to use `/subscription/subscribe`
    - Update `verifyRazorpayPayment` to use `/subscription/verify-subscription`
    - Update `initialSubscribe` to use `/subscription/initial-subscribe`
    - Update `getBillingHistory` to use `/subscription/billing-history`
    - Update `manageFeatures` to use `/subscription/manage-features/:planId`
    - Preserve existing cache invalidation tags (`SubscriptionPlans`)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x] 2.2 Migrate `limitationsApi.ts` endpoints to `/subscription/limitations/` prefix
    - Update `getLimitationsOverview` to use `/subscription/limitations/overview`
    - Add new `checkFeatureLimit` endpoint at `/subscription/limitations/check/:key`
    - Ensure `transformResponse` unwraps `response.data` correctly for new field structure
    - Maintain `keepUnusedDataFor: MAX_SAFE_INTEGER` caching
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 2.7_

  - [x] 2.3 Migrate `planLimitsApi.ts` endpoints to `/subscription/plan-limits/` prefix
    - Update `getAllPlanLimits` to use `/subscription/plan-limits/`
    - Update `getPlanLimits` to use `/subscription/plan-limits/:planId`
    - Update `bulkUpdatePlanLimits` to use `/subscription/plan-limits/:planId`
    - Update `updateSingleLimit` to use `/subscription/plan-limits/:planId/:featureKey`
    - Import `FeatureKey` from `limitationsApi.types.ts` instead of local definition
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 6.3_

- [x] 3. Implement add-on API endpoints
  - [x] 3.1 Add add-on query and mutation endpoints to `subscriptionApi.ts`
    - Add `getAvailableAddons` query at `/subscription/addons/available` (provides `["Addons"]` tag)
    - Add `purchaseAddon` mutation at `/subscription/addons/purchase`
    - Add `verifyAddonPurchase` mutation at `/subscription/addons/verify-purchase` (invalidates `["MyAddons"]` + dispatches `limitationsApi.util.invalidateTags(["Limitations"])`)
    - Add `getMyAddons` query at `/subscription/addons/my-addons` (provides `["MyAddons"]` tag)
    - Add `cancelAddon` mutation at `/subscription/addons/cancel/:id` (invalidates `["MyAddons"]` + dispatches `limitationsApi.util.invalidateTags(["Limitations"])`)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [x] 4. Update useFeatureGate hook
  - [x] 4.1 Refactor `useFeatureGate` hook for new type structure
    - Update `deriveFeatureStatus` to use `totalLimit` and `remaining` fields
    - Return `totalLimit` instead of `limitValue` in `FeatureGateResult`
    - Handle unlimited state as `totalLimit === null`
    - Ensure LimitationsProvider continues to prefetch on authentication without code changes beyond types
    - _Requirements: 2.4, 2.5, 7.5, 7.6, 7.7_

- [x] 5. Checkpoint - Ensure all API and hook changes compile
  - Run `npx tsc --noEmit` to verify no TypeScript errors
  - Run ESLint to verify no new lint errors
  - Ask the user if questions arise.

- [x] 6. Decompose Subscription page into components
  - [x] 6.1 Extract `CurrentPlanCard` component to `src/components/subscription/CurrentPlanCard.tsx`
    - Accept props: `planName`, `planDescription`, `isActive`, `isProPlan`, `renewalDate`, `features`, `proPlanFeatures`
    - Render plan name, status chip, description, renewal date, upgrade prompt
    - Delegate feature rendering to `PlanFeaturesList`
    - _Requirements: 5.1, 5.6_

  - [x] 6.2 Extract `PlanFeaturesList` component to `src/components/subscription/PlanFeaturesList.tsx`
    - Accept props: `features` array and `isLocked` flag
    - Render grid of feature items with check icon + title + subtitle
    - Support locked state for pro-plan teaser features
    - _Requirements: 5.2, 5.6_

  - [x] 6.3 Extract `BillingHistoryTable` component to `src/components/subscription/BillingHistoryTable.tsx`
    - Accept props: `billingHistory` array and `onViewInvoice` callback
    - Render HeroUI Table with all required columns
    - _Requirements: 5.3, 5.6_

  - [x] 6.4 Extract `InvoicePreviewModal` component to `src/components/subscription/InvoicePreviewModal.tsx`
    - Accept props: `isOpen`, `onClose`, `invoiceData`
    - Self-contained with iframe sizing, PDF download, and print logic
    - No dependency on parent Subscription page state
    - _Requirements: 5.4, 5.6_

  - [x] 6.5 Refactor `Subscription.tsx` to compose extracted components
    - Import and render `CurrentPlanCard`, `PlanFeaturesList`, `BillingHistoryTable`, `InvoicePreviewModal`
    - Import helpers from `src/utils/subscriptionHelpers.ts`
    - Ensure markup structure and CSS classes match pre-decomposition output
    - _Requirements: 5.5, 5.7_

- [x] 7. Remove unused code
  - [x] 7.1 Remove dead code from subscription module
    - Delete commented-out legacy SubscriptionModal code
    - Remove `getAllSubscriptions` endpoint, its hook `useGetAllSubscriptionsQuery`, and its response type
    - Remove duplicate `FeatureKey` type definition from `planLimitsApi.ts`
    - Verify no TypeScript compilation errors and no new lint errors
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8. Final checkpoint - Verify full build compiles cleanly
  - Run `npx tsc --noEmit` to confirm zero TypeScript errors
  - Run ESLint to confirm no new lint warnings
  - Ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The project uses TypeScript with React, RTK Query, HeroUI, and Vite
- All API route changes are prefix migrations only — request/response shapes remain the same unless noted
- Cross-slice cache invalidation (subscriptionApi → limitationsApi) uses `util.invalidateTags` dispatch pattern

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "3.1"] },
    { "id": 2, "tasks": ["4.1"] },
    { "id": 3, "tasks": ["6.1", "6.2", "6.3", "6.4"] },
    { "id": 4, "tasks": ["6.5", "7.1"] }
  ]
}
```
