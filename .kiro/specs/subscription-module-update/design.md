# Design Document: Subscription Module Update

## Overview

This design updates the MediSetu React frontend subscription module to align with the new backend API routes under `/api/v1/subscription`. The changes are primarily in the data layer (RTK Query API slices, types, hooks) and code organization (component decomposition), while preserving existing UI behavior.

Key changes:
1. **Route migration** — All subscription/limitations/plan-limits API slices switch from `/users/subscription/`, `/users/limitations/`, and `/users/plan-limits/` prefixes to `/subscription/` prefix.
2. **Add-on system** — New RTK Query endpoints for purchasing, verifying, viewing, and cancelling add-ons, integrated with the existing Razorpay flow.
3. **Limitations type update** — `FeatureLimit` gains `baseLimit`, `addOnLimit`, `totalLimit` fields; `limitValue` is removed. The `useFeatureGate` hook adapts accordingly.
4. **Component decomposition** — The monolithic `Subscription.tsx` page is split into `CurrentPlanCard`, `PlanFeaturesList`, `BillingHistoryTable`, and `InvoicePreviewModal` components.
5. **Code cleanup** — Remove dead code (commented-out legacy modal, unused `getAllSubscriptions` endpoint, duplicate `FeatureKey` type).
6. **Shared Razorpay utility** — Extend `src/utils/razorpay.ts` to support both subscription and add-on payment flows via a unified interface.

## Architecture

```mermaid
graph TD
    subgraph "App Layer"
        A[LimitationsProvider] --> B[limitationsApi - RTK Query]
        C[Subscription Page] --> D[subscriptionApi - RTK Query]
        C --> E[CurrentPlanCard]
        C --> F[PlanFeaturesList]
        C --> G[BillingHistoryTable]
        C --> H[InvoicePreviewModal]
    end

    subgraph "Hooks Layer"
        I[useFeatureGate] --> B
        J[usePlanInfo] --> B
    end

    subgraph "Utility Layer"
        K[razorpay.ts] --> L[Razorpay SDK]
        M[subscriptionHelpers.ts]
    end

    subgraph "Backend API /api/v1/subscription"
        N[/subscription/plans]
        O[/subscription/subscribe]
        P[/subscription/verify-subscription]
        Q[/subscription/initial-subscribe]
        R[/subscription/billing-history]
        S[/subscription/manage-features/:planId]
        T[/subscription/limitations/overview]
        U[/subscription/limitations/check/:key]
        V[/subscription/addons/available]
        W[/subscription/addons/purchase]
        X[/subscription/addons/verify-purchase]
        Y[/subscription/addons/my-addons]
        Z[/subscription/addons/cancel/:id]
        AA[/subscription/plan-limits/]
    end

    D --> N
    D --> O
    D --> P
    D --> Q
    D --> R
    D --> S
    D --> V
    D --> W
    D --> X
    D --> Y
    D --> Z
    B --> T
    B --> U
```

### Data Flow

1. **Startup**: `LimitationsProvider` triggers `limitationsApi.getLimitationsOverview` when authenticated.
2. **Caching**: Response stored in `limitationsApi` reducer with infinite TTL (`keepUnusedDataFor: MAX_SAFE_INTEGER`).
3. **Consumption**: `useFeatureGate(key)` uses `selectFromResult` to subscribe to specific feature entries.
4. **Add-on purchase**: Component calls purchase mutation → Razorpay utility opens checkout → on success calls verify-purchase mutation → invalidates Limitations + my-addons cache.
5. **Cross-slice invalidation**: `subscriptionApi` mutations dispatch `limitationsApi.util.invalidateTags(["Limitations"])` on successful subscription/add-on operations.

## Components and Interfaces

### 1. `subscriptionApi` (RTK Query Slice)

**File**: `src/redux/api/subscriptionApi.ts`

Migrated endpoints (URL changes only):
| Endpoint | Old URL | New URL | Method |
|----------|---------|---------|--------|
| `getSubscriptionPlans` | `/users/subscription/plans` | `/subscription/plans` | GET |
| `createSubscriptionPlan` | `/users/subscription/plans` | `/subscription/plans` | POST |
| `updateSubscriptionPlan` | `/users/subscription/plans/:id` | `/subscription/plans/:id` | PATCH |
| `deleteSubscriptionPlan` | `/users/subscription/plans/:id` | `/subscription/plans/:id` | DELETE |
| `manageFeatures` | `/users/subscription/manage-features/:planId` | `/subscription/manage-features/:planId` | PATCH |
| `subscribe` / `createRazorpayOrder` | `/users/subscription/subscribe` | `/subscription/subscribe` | POST |
| `verifyRazorpayPayment` | `/users/subscription/verify-subscription` | `/subscription/verify-subscription` | POST |
| `initialSubscribe` | `/users/subscription/initial-subscribe` | `/subscription/initial-subscribe` | POST |
| `getBillingHistory` | `/users/subscription/billing-history` | `/subscription/billing-history` | GET |
| `getAllPlans` | `/users/subscription/plans` | `/subscription/plans` | GET |

New add-on endpoints:
| Endpoint | URL | Method | Request Body |
|----------|-----|--------|--------------|
| `getAvailableAddons` | `/subscription/addons/available` | GET | — |
| `purchaseAddon` | `/subscription/addons/purchase` | POST | `{ addOnId, billingCycle, quantity }` |
| `verifyAddonPurchase` | `/subscription/addons/verify-purchase` | POST | `{ orderId, paymentId, signature, addOnId, billingCycle, quantity }` |
| `getMyAddons` | `/subscription/addons/my-addons` | GET | — |
| `cancelAddon` | `/subscription/addons/cancel/:id` | PUT | — |

Cache invalidation tags:
- `getAvailableAddons` → provides `["Addons"]`
- `getMyAddons` → provides `["MyAddons"]`
- `purchaseAddon` → no invalidation (only order creation)
- `verifyAddonPurchase` → invalidates `["MyAddons"]` + dispatches `limitationsApi.util.invalidateTags(["Limitations"])`
- `cancelAddon` → invalidates `["MyAddons"]` + dispatches `limitationsApi.util.invalidateTags(["Limitations"])`

Removed endpoints:
- `getAllSubscriptions` (queried `/doctor/get-all-plains`)

### 2. `limitationsApi` (RTK Query Slice)

**File**: `src/redux/api/limitationsApi.ts`

Migrated endpoints:
| Endpoint | Old URL | New URL | Method |
|----------|---------|---------|--------|
| `getLimitationsOverview` | `/users/limitations/overview` | `/subscription/limitations/overview` | GET |

New endpoints:
| Endpoint | URL | Method |
|----------|-----|--------|
| `checkFeatureLimit` | `/subscription/limitations/check/:key` | GET |

The `transformResponse` remains: unwrap `response.data` from the API envelope.

### 3. `planLimitsApi` (RTK Query Slice)

**File**: `src/redux/api/planLimitsApi.ts`

Migrated endpoints:
| Endpoint | Old URL | New URL | Method |
|----------|---------|---------|--------|
| `getAllPlanLimits` | `/users/plan-limits/` | `/subscription/plan-limits/` | GET |
| `getPlanLimits` | `/users/plan-limits/:planId` | `/subscription/plan-limits/:planId` | GET |
| `bulkUpdatePlanLimits` | `/users/plan-limits/:planId` | `/subscription/plan-limits/:planId` | PUT |
| `updateSingleLimit` | `/users/plan-limits/:planId/:featureKey` | `/subscription/plan-limits/:planId/:featureKey` | PATCH |

### 4. Updated Type Definitions

**File**: `src/redux/api/limitationsApi.types.ts`

```typescript
export interface FeatureLimit {
  featureKey: FeatureKey;
  description: string;
  enabled: boolean;
  baseLimit: number | null;      // NEW
  addOnLimit: number | null;     // NEW
  totalLimit: number | null;     // NEW (replaces limitValue)
  currentUsage: number;
  remaining: number | null;
}

export interface FeatureGateResult {
  status: FeatureStatus;
  description: string;
  totalLimit: number | null;     // renamed from limitValue
  currentUsage: number;
  remaining: number | null;
  isLoading: boolean;
}
```

The `isUnlimited` field is removed from `FeatureLimit` — unlimited is now expressed as `totalLimit: null`.

### 5. `useFeatureGate` Hook Update

**File**: `src/hooks/useFeatureGate.ts`

Updated `deriveFeatureStatus`:
```typescript
export function deriveFeatureStatus(limit: {
  enabled: boolean;
  remaining: number | null;
  totalLimit: number | null;
}): FeatureStatus {
  if (!limit.enabled) return "disabled";
  if (limit.totalLimit === null) return "enabled"; // unlimited
  if (limit.remaining !== null && limit.remaining <= 0) return "limit_reached";
  return "enabled";
}
```

The hook now returns `totalLimit` instead of `limitValue`:
```typescript
return {
  status: deriveFeatureStatus(featureLimit),
  description: featureLimit.description,
  totalLimit: featureLimit.totalLimit,
  currentUsage: featureLimit.currentUsage,
  remaining: featureLimit.remaining,
  isLoading: false,
};
```

### 6. Add-On Type Definitions

**File**: `src/redux/api/subscriptionApi.ts` (added types)

```typescript
export type BillingCycle = "monthly" | "yearly";

export interface AddOn {
  id: string;
  name: string;
  description: string;
  featureKey: FeatureKey;
  unitPrice: number;
  currency: string;
  maxQuantity: number;
  billingCycles: BillingCycle[];
}

export interface AvailableAddonsResponse {
  success: boolean;
  data: AddOn[];
}

export interface PurchaseAddonRequest {
  addOnId: string;
  billingCycle: BillingCycle;
  quantity: number; // 1–100
}

export interface PurchaseAddonResponse {
  success: boolean;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface VerifyAddonPurchaseRequest {
  orderId: string;
  paymentId: string;
  signature: string;
  addOnId: string;
  billingCycle: BillingCycle;
  quantity: number;
}

export interface VerifyAddonPurchaseResponse {
  success: boolean;
  message: string;
}

export interface MyAddOn {
  id: string;
  addOnId: string;
  name: string;
  featureKey: FeatureKey;
  quantity: number;
  billingCycle: BillingCycle;
  status: "active" | "cancelled" | "expired";
  startsAt: string;
  expiresAt: string;
  createdAt: string;
}

export interface MyAddonsResponse {
  success: boolean;
  data: MyAddOn[];
}
```

### 7. Shared Razorpay Utility

**File**: `src/utils/razorpay.ts`

Updated interface to support both subscription and add-on flows:

```typescript
export interface RazorpayOptions {
  keyId: string;
  amount: number;
  currency: string;
  orderId: string;
  description: string;          // NEW: replaces derived description
  planId?: string;              // optional for add-ons
  planName?: string;            // optional for add-ons
  addOnId?: string;             // NEW: for add-on payments
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface PaymentResult {
  success: boolean;
  orderId?: string;
  paymentId?: string;
  signature?: string;
  paymentMethod?: string;
  error?: string;
}
```

Key changes:
- `description` becomes a required field (caller provides context-specific text).
- `planId` and `planName` become optional (not needed for add-on purchases).
- `addOnId` added as optional field.
- Script load timeout: 10 seconds via `setTimeout` + `Promise.race`.

### 8. Extracted Page Components

#### `CurrentPlanCard`

**File**: `src/components/subscription/CurrentPlanCard.tsx`

```typescript
interface CurrentPlanCardProps {
  planName: string;
  planDescription: string;
  isActive: boolean;
  isProPlan: boolean;
  renewalDate: string;
  features: PlanFeature[];
  proPlanFeatures: PlanFeature[];
}
```

Renders: plan name, status chip, description, renewal date, upgrade prompt, and delegates feature rendering to `PlanFeaturesList`.

#### `PlanFeaturesList`

**File**: `src/components/subscription/PlanFeaturesList.tsx`

```typescript
interface PlanFeaturesListProps {
  features: PlanFeature[];
  isLocked?: boolean;
}
```

Renders a grid of `FeatureItem` entries (check icon + title + subtitle). Supports `isLocked` state for pro-plan teaser features.

#### `BillingHistoryTable`

**File**: `src/components/subscription/BillingHistoryTable.tsx`

```typescript
interface BillingHistoryTableProps {
  billingHistory: BillingHistoryItem[];
  onViewInvoice: (item: BillingHistoryItem) => void;
}
```

Renders the HeroUI `Table` with columns: start date, end date, plan, amount, payment mode, transaction ID, payment status, transaction date, status, invoice action.

#### `InvoicePreviewModal`

**File**: `src/components/subscription/InvoicePreviewModal.tsx`

```typescript
interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: InvoiceData;
}
```

Self-contained modal managing iframe sizing, PDF download, and print logic. No dependency on parent `Subscription` page state.

### 9. Shared Utility File

**File**: `src/utils/subscriptionHelpers.ts`

Exports:
- `safeFormatMoney(amount: number, currency: string): string`
- `calculatePriceBreakdown(grandTotal: number): PriceBreakdown`
- `generateInvoiceHTML(data: InvoiceData): string`

### 10. Canonical FeatureKey

**File**: `src/redux/api/limitationsApi.types.ts` (single source of truth)

The `FeatureKey` type in `planLimitsApi.ts` is removed. Instead, `planLimitsApi.ts` imports from `limitationsApi.types.ts`:

```typescript
import type { FeatureKey } from "./limitationsApi.types";
```

## Data Models

### Updated `FeatureLimit` (Limitations API Response)

```typescript
interface FeatureLimit {
  featureKey: FeatureKey;
  description: string;
  enabled: boolean;
  baseLimit: number | null;
  addOnLimit: number | null;
  totalLimit: number | null;
  currentUsage: number;
  remaining: number | null;
}
```

`totalLimit = baseLimit + addOnLimit` (computed server-side). When `totalLimit` is `null`, the feature is unlimited.

### `LimitationsOverviewResponse`

```typescript
interface LimitationsOverviewResponse {
  plan: PlanInfo;
  limits: FeatureLimit[];
}
```

### `PlanInfo`

```typescript
interface PlanInfo {
  planId: string;
  planSlug: string;
}
```

### `InvoiceData` (for Invoice Modal)

```typescript
interface InvoiceData {
  id: string;
  transactionId: string;
  planName: string;
  planDescription: string;
  price: number;
  startsAt: string;
  expiresAt: string;
  createdAt: string;
  paymentMode: string;
  paymentStatus: string;
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicState: string;
  clinicCity: string;
  zipCode: string;
  currency: string;
  adminName: string;
  adminEmail: string;
  adminMobile: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Limitations response transform preserves all fields

*For any* valid limitations API response containing an array of feature limit entries with arbitrary `baseLimit`, `addOnLimit`, `totalLimit`, `currentUsage`, and `remaining` values, the `transformResponse` function SHALL produce a `LimitationsOverviewResponse` where every entry's fields are identical to those in the raw response.

**Validates: Requirements 2.3, 2.7**

### Property 2: Feature status derivation correctness

*For any* `FeatureLimit` entry, `deriveFeatureStatus` SHALL return:
- `"disabled"` when `enabled` is `false`,
- `"enabled"` when `totalLimit` is `null` (unlimited),
- `"limit_reached"` when `enabled` is `true`, `totalLimit` is not null, and `remaining <= 0`,
- `"enabled"` otherwise.

This must hold regardless of the values of `baseLimit`, `addOnLimit`, `currentUsage`, or `description`.

**Validates: Requirements 2.4, 2.5, 7.5, 7.6**

### Property 3: Razorpay PaymentResult contract

*For any* invocation of the Razorpay utility:
- If the Razorpay handler callback fires with response fields, the returned `PaymentResult` SHALL have `success: true` and contain non-empty `orderId`, `paymentId`, and `signature`.
- If the modal is dismissed or an error occurs, the returned `PaymentResult` SHALL have `success: false` and contain a non-empty `error` string.

**Validates: Requirements 9.2, 9.3, 9.6, 9.7**

### Property 4: safeFormatMoney produces valid currency string

*For any* non-negative number `amount` and valid ISO 4217 currency code, `safeFormatMoney(amount, currency)` SHALL return a non-empty string containing the formatted amount. For invalid currency codes, it SHALL return a fallback string containing the amount prefixed with `₹`.

**Validates: Requirements 5.7**

## Error Handling

### API Error Propagation

All RTK Query endpoints propagate errors through the standard `error` / `isError` state fields. No custom error transformation is applied — components access `error.data?.message` for user-facing messages.

**Subscription/Add-on errors:**
- Network errors → RTK Query sets `isError: true`, cached data unchanged.
- 4xx/5xx responses → `error.data` contains the server error payload.
- Toast notifications are shown at the component level, not in the API slice.

### Razorpay Error Handling

| Scenario | Result |
|----------|--------|
| Script fails to load (timeout 10s) | `PaymentResult { success: false, error: "Payment gateway could not be loaded" }` |
| User dismisses modal | `PaymentResult { success: false, error: "Payment cancelled by user" }` |
| `new Razorpay()` throws | `PaymentResult { success: false, error: "Failed to initialize payment gateway" }` |
| Verification API fails | Error toast with server message or fallback |

### Component Error States

- `Subscription` page: shows error card if `clinicsError` or `billingError` is truthy.
- Extracted components receive data via props — they don't fetch directly, so errors are handled at the page level.
- Loading states use HeroUI `Skeleton` components for perceived performance.

## Testing Strategy

### Unit Tests (Example-Based)

- **API slice URL verification**: For each migrated endpoint, mock the baseQuery and verify the generated request URL matches the new path.
- **Add-on endpoint tests**: Verify request body shape and cache invalidation behavior.
- **Component rendering**: Each extracted component (`CurrentPlanCard`, `PlanFeaturesList`, `BillingHistoryTable`, `InvoicePreviewModal`) renders correctly with sample props.
- **Razorpay utility**: Test script loading timeout, dismiss handling, and initialization error scenarios.
- **Code cleanup verification**: Ensure removed endpoints/types don't appear in exports.

### Property-Based Tests

**Library**: [fast-check](https://github.com/dubzzz/fast-check)

Since the project does not currently have a test runner, the testing strategy assumes adding `vitest` + `fast-check` as dev dependencies. Each property test runs a minimum of 100 iterations.

| Property | Test Target | Tag |
|----------|-------------|-----|
| Property 1 | `transformResponse` in `limitationsApi.ts` | Feature: subscription-module-update, Property 1: Limitations response transform preserves all fields |
| Property 2 | `deriveFeatureStatus` in `useFeatureGate.ts` | Feature: subscription-module-update, Property 2: Feature status derivation correctness |
| Property 3 | `processRazorpayPayment` in `razorpay.ts` | Feature: subscription-module-update, Property 3: Razorpay PaymentResult contract |
| Property 4 | `safeFormatMoney` in `subscriptionHelpers.ts` | Feature: subscription-module-update, Property 4: safeFormatMoney produces valid currency string |

### Integration Tests

- **Cross-slice cache invalidation**: Verify that `verifyAddonPurchase` and `cancelAddon` mutations trigger `limitationsApi` cache invalidation.
- **LimitationsProvider**: Verify query is skipped when unauthenticated and triggered when authenticated.
- **Full add-on purchase flow**: Mock API + Razorpay SDK, verify end-to-end flow from purchase initiation to cache refresh.

### Visual Regression

- Snapshot test comparing the composed `Subscription` page output (post-decomposition) against the pre-decomposition output at 375px, 768px, and 1280px viewports using the same mock data.
