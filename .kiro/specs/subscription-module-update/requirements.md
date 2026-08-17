# Requirements Document

## Introduction

Update the existing subscription module in the MediSetu React frontend to integrate with the updated backend API routes under `/api/v1/subscription`. This includes migrating existing endpoints from the `/users/subscription/` and `/users/limitations/` prefixes to the new `/subscription/` prefix, introducing a new add-on system (purchase, verify, view, cancel), updating the limitations response format to include `baseLimit`/`addOnLimit`/`totalLimit` fields, and decomposing the monolithic `Subscription.tsx` page into smaller reusable components. The UI remains largely unchanged; the focus is on data integration, code simplification, and reusability.

## Glossary

- **Subscription_API_Slice**: The RTK Query API slice (`subscriptionApi.ts`) that manages all subscription-related API calls including plans, subscribe, verify, billing, and add-ons.
- **Limitations_API_Slice**: The RTK Query API slice (`limitationsApi.ts`) that fetches feature usage limits and plan metadata.
- **Add_On**: A purchasable extension to a subscription plan that increases specific feature limits (e.g., extra doctor accounts, extra WhatsApp messages).
- **Razorpay**: The payment gateway used for processing paid subscriptions and add-on purchases.
- **Feature_Gate_Hook**: The `useFeatureGate` hook that checks whether a feature is enabled, disabled, or at its limit for the current plan.
- **Plan_Limits_API_Slice**: The RTK Query API slice (`planLimitsApi.ts`) used by SuperAdmin to manage plan-level feature limits.
- **Subscription_Page**: The main subscription management page rendered at `/profile/subscription`.
- **Invoice_Preview_Modal**: The modal component that renders and allows download of subscription invoices.
- **Billing_History_Table**: The table component displaying past subscription payments and transactions.

## Requirements

### Requirement 1: Migrate Subscription API Routes

**User Story:** As a developer, I want the subscription API slice to use the new backend route prefix, so that the frontend correctly communicates with the updated backend.

#### Acceptance Criteria

1. THE Subscription_API_Slice SHALL use `/subscription/plans` as the base path for all plan CRUD operations via GET (list), POST (create), PATCH (update by id), and DELETE (delete by id), replacing the previous `/users/subscription/plans` prefix.
2. THE Subscription_API_Slice SHALL use `/subscription/subscribe` for initiating a paid subscription and creating a Razorpay order via POST, replacing the previous `/users/subscription/subscribe` path.
3. THE Subscription_API_Slice SHALL use `/subscription/verify-subscription` for verifying Razorpay payment via POST, replacing the previous `/users/subscription/verify-subscription` path.
4. THE Subscription_API_Slice SHALL use `/subscription/initial-subscribe` for subscribing to the free plan via POST, replacing the previous `/users/subscription/initial-subscribe` path.
5. THE Subscription_API_Slice SHALL use `/subscription/billing-history` for fetching billing history via GET, replacing the previous `/users/subscription/billing-history` path.
6. THE Subscription_API_Slice SHALL use `/subscription/manage-features/{planId}` for updating plan features via PATCH, replacing the previous `/users/subscription/manage-features/{planId}` path.
7. WHEN any migrated endpoint returns a non-2xx HTTP status, THE Subscription_API_Slice SHALL propagate the error through RTK Query's existing error handling without altering current error behavior or cache invalidation logic.

### Requirement 2: Migrate Limitations API Route

**User Story:** As a developer, I want the limitations API slice to use the new backend route, so that feature limit checks work with the updated backend.

#### Acceptance Criteria

1. THE Limitations_API_Slice SHALL use `/subscription/limitations/overview` as the GET endpoint for fetching the limitations overview, replacing the previous `/users/limitations/overview` route.
2. THE Limitations_API_Slice SHALL use `/subscription/limitations/check/:key` as the GET endpoint for checking a single feature limit, where `:key` is a valid `FeatureKey` value as defined in the application's type system.
3. WHEN the limitations overview response is received, THE Limitations_API_Slice SHALL parse the `baseLimit`, `addOnLimit`, `totalLimit`, `currentUsage`, and `remaining` fields from each feature limit entry in the `limits` array.
4. THE Feature_Gate_Hook SHALL derive the effective limit from the `totalLimit` field in the updated response format, exposing it as the `limitValue` property in the `FeatureGateResult` return type to maintain the existing consumer contract.
5. WHEN a feature limit entry has a `totalLimit` value of `null`, THE Feature_Gate_Hook SHALL treat that feature as unlimited and derive a status of `"enabled"` regardless of `currentUsage`.
6. IF the GET request to `/subscription/limitations/overview` or `/subscription/limitations/check/:key` fails due to a network error or non-success HTTP status, THEN THE Limitations_API_Slice SHALL leave the cached data unchanged and expose the error via RTK Query's standard `error` and `isError` state fields.
7. WHEN the single feature limit check response is received from `/subscription/limitations/check/:key`, THE Limitations_API_Slice SHALL parse the same fields per entry as the overview endpoint: `featureKey`, `description`, `enabled`, `baseLimit`, `addOnLimit`, `totalLimit`, `currentUsage`, and `remaining`.

### Requirement 3: Add-On System API Integration

**User Story:** As a clinic admin, I want to purchase add-ons to extend my plan limits, so that I can scale specific features beyond my base plan.

#### Acceptance Criteria

1. THE Subscription_API_Slice SHALL provide a query endpoint at `/subscription/addons/available` via GET to fetch available add-ons.
2. THE Subscription_API_Slice SHALL provide a mutation endpoint at `/subscription/addons/purchase` via POST to initiate an add-on purchase, accepting a request body containing addOnId (string), billingCycle (one of "monthly" or "yearly"), and quantity (integer between 1 and 100 inclusive).
3. THE Subscription_API_Slice SHALL provide a mutation endpoint at `/subscription/addons/verify-purchase` via POST to verify an add-on Razorpay payment, accepting a request body containing orderId, paymentId, signature, addOnId, billingCycle, and quantity.
4. THE Subscription_API_Slice SHALL provide a query endpoint at `/subscription/addons/my-addons` via GET to fetch the current user's active add-ons.
5. THE Subscription_API_Slice SHALL provide a mutation endpoint at `/subscription/addons/cancel/:id` via PUT to cancel an active add-on.
6. WHEN an add-on purchase is verified successfully, THE Subscription_API_Slice SHALL invalidate the Limitations cache tag so that the next component accessing limitations data receives updated limits without requiring a manual page refresh.
7. IF the add-on purchase initiation or verification endpoint returns a non-success response, THEN THE Subscription_API_Slice SHALL propagate the error to the calling component without modifying local cache state.
8. IF the cancel add-on endpoint returns a non-success response, THEN THE Subscription_API_Slice SHALL propagate the error to the calling component and leave the existing my-addons cache unchanged.
9. WHEN an add-on is successfully cancelled, THE Subscription_API_Slice SHALL invalidate both the my-addons query cache and the Limitations cache tag so that updated add-on status and adjusted limits are reflected to the user.

### Requirement 4: Add-On Purchase Razorpay Flow

**User Story:** As a clinic admin, I want the add-on purchase to use the same Razorpay checkout flow as plan subscriptions, so that I have a consistent payment experience.

#### Acceptance Criteria

1. WHEN a user initiates an add-on purchase, THE Subscription_API_Slice SHALL call `/subscription/addons/purchase` with a request body containing addOnId, billingCycle, and quantity, and receive an orderId, amount, currency, and keyId within 30 seconds.
2. WHEN the order details are received, THE Razorpay utility SHALL load the Razorpay checkout script (if not already loaded) and open the Razorpay checkout modal with the provided orderId, amount, currency, and keyId.
3. WHEN Razorpay returns a successful payment, THE Subscription_API_Slice SHALL call `/subscription/addons/verify-purchase` with orderId, paymentId, signature, addOnId, billingCycle, and quantity, and upon successful verification display a success toast indicating the add-on was activated.
4. IF the Razorpay checkout is dismissed by the user, THEN THE system SHALL display an informational toast indicating payment was cancelled and return the user to the add-on selection view without modifying any add-on state.
5. IF the add-on verification call fails, THEN THE system SHALL display an error toast containing the server-provided error message, or a fallback message indicating verification failed if no server message is available.
6. IF the `/subscription/addons/purchase` call fails or the Razorpay script fails to load, THEN THE system SHALL display an error toast indicating the payment could not be initiated and SHALL NOT open the Razorpay checkout modal.

### Requirement 5: Decompose Subscription Page Into Smaller Components

**User Story:** As a developer, I want the monolithic Subscription page broken into focused components, so that the code is easier to maintain and test.

#### Acceptance Criteria

1. THE Subscription_Page SHALL delegate current plan display (plan name, status chip, description, renewal date, and upgrade prompt) to a dedicated `CurrentPlanCard` component that accepts plan data and subscription status via props.
2. THE Subscription_Page SHALL delegate feature list rendering (both active plan features and locked Pro plan features) to a dedicated `PlanFeaturesList` component that accepts a features array and an `isLocked` flag via props.
3. THE Subscription_Page SHALL delegate billing history display (table with columns for dates, plan, amount, payment mode, transaction ID, payment status, and invoice action) to a dedicated `BillingHistoryTable` component that accepts the billing history array and an invoice-view callback via props.
4. THE Invoice_Preview_Modal SHALL be extracted into its own file as a standalone component that accepts `isOpen`, `onClose`, and `invoiceData` props and internally manages its own iframe sizing, PDF download, and print logic without depending on parent component state.
5. THE Subscription_Page SHALL compose the above components to produce markup structure and applied CSS classes identical to the pre-decomposition output, verified by rendering both versions with the same mock data and confirming no visible differences at viewport widths of 375px, 768px, and 1280px.
6. WHEN any extracted component is rendered in isolation with valid props, THE component SHALL render without runtime errors and without importing the parent Subscription_Page module.
7. THE Subscription_Page SHALL extract shared helper functions (`safeFormatMoney`, `calculatePriceBreakdown`, `generateInvoiceHTML`) into a separate utility file that is imported by both the page and any child component that requires them.

### Requirement 6: Remove Unused Code

**User Story:** As a developer, I want unused and dead code removed from the subscription module, so that the codebase stays clean and maintainable.

#### Acceptance Criteria

1. THE Subscription_API_Slice SHALL NOT contain the commented-out legacy SubscriptionModal code (lines 1–213 of `SubscriptionModal.tsx` that are entirely wrapped in `//` comments).
2. THE Subscription_API_Slice SHALL NOT contain the `getAllSubscriptions` endpoint that queries `/doctor/get-all-plains`, its associated exported hook `useGetAllSubscriptionsQuery`, or its response type `AllSubscriptionsResponse` if no other endpoint uses it.
3. THE subscription module SHALL NOT contain duplicated `FeatureKey` type definitions; a single canonical definition SHALL exist in one file, and all other files SHALL import from that single source.
4. WHEN any code identified in criteria 1–3 is removed, THE remaining module SHALL compile without TypeScript errors and produce zero new lint errors as reported by the project's ESLint configuration.
5. WHEN any code identified in criteria 1–3 is removed, THE subscription module SHALL preserve all existing runtime behavior — no user-facing feature, API call, or UI rendering SHALL change as a result of the removal.

### Requirement 7: Update Limitations Type Definitions

**User Story:** As a developer, I want the TypeScript types to reflect the new limitations API response shape, so that type safety is maintained across the codebase.

#### Acceptance Criteria

1. THE FeatureLimit type SHALL include a `baseLimit` field of type `number | null`.
2. THE FeatureLimit type SHALL include an `addOnLimit` field of type `number | null`.
3. THE FeatureLimit type SHALL include a `totalLimit` field of type `number | null`.
4. THE FeatureLimit type SHALL NOT include the `limitValue` field.
5. THE FeatureGateResult interface SHALL expose `totalLimit` of type `number | null` instead of `limitValue`.
6. WHEN the useFeatureGate hook returns a result, THE hook SHALL populate the `totalLimit` field from the matched FeatureLimit entry's `totalLimit` value.
7. THE LimitationsProvider SHALL continue to prefetch limitations data on authentication without requiring code changes beyond the type updates.

### Requirement 8: Migrate Plan Limits API Routes (SuperAdmin)

**User Story:** As a developer, I want the SuperAdmin plan limits API to use updated routes if applicable, so that the admin panel continues to function with the new backend.

#### Acceptance Criteria

1. THE Plan_Limits_API_Slice SHALL use `/subscription/plan-limits/` as the base path for all plan limit management endpoints, replacing the previous `/users/plan-limits/` prefix.
2. WHEN fetching all plan limits, THE Plan_Limits_API_Slice SHALL send a GET request to `/subscription/plan-limits/`.
3. WHEN fetching limits for a specific plan, THE Plan_Limits_API_Slice SHALL send a GET request to `/subscription/plan-limits/:planId`.
4. WHEN bulk-updating limits for a specific plan, THE Plan_Limits_API_Slice SHALL send a PUT request to `/subscription/plan-limits/:planId` with the limits array in the request body.
5. WHEN patching a single limit, THE Plan_Limits_API_Slice SHALL send a PATCH request to `/subscription/plan-limits/:planId/:featureKey` with the partial limit fields in the request body.

### Requirement 9: Shared Razorpay Payment Utility

**User Story:** As a developer, I want a single reusable Razorpay utility that handles both subscription and add-on payments, so that payment logic is not duplicated.

#### Acceptance Criteria

1. THE Razorpay utility SHALL accept a `RazorpayOptions` object with required fields (keyId, amount, currency, orderId, description) and optional fields (planId, planName, addOnId, customerName, customerEmail, customerPhone) so that the same interface supports both subscription and add-on payment flows.
2. WHEN payment succeeds, THE Razorpay utility SHALL return a `PaymentResult` containing success as true, orderId, paymentId, signature, and paymentMethod.
3. IF payment fails or is dismissed, THEN THE Razorpay utility SHALL return a `PaymentResult` containing success as false and an error field indicating the failure reason.
4. WHEN invoked, THE Razorpay utility SHALL load the Razorpay checkout script if not already present, initialize the checkout with the provided options, and open the payment modal in a single function call.
5. IF the Razorpay script fails to load within 10 seconds or the network request errors, THEN THE Razorpay utility SHALL return a failure result with an error field indicating the script could not be loaded.
6. IF the user dismisses the Razorpay checkout modal without completing payment, THEN THE Razorpay utility SHALL return a failure result with an error field indicating the payment was cancelled by the user.
7. IF the Razorpay checkout initialization throws an exception, THEN THE Razorpay utility SHALL return a failure result with an error field indicating the payment gateway failed to initialize.

### Requirement 10: SuperAdmin Plan Management Route Migration

**User Story:** As a developer, I want the SuperAdmin plan CRUD endpoints to use the new route prefix, so that plan management works with the updated backend.

#### Acceptance Criteria

1. WHEN a SuperAdmin requests the list of plans, THE Subscription_API_Slice SHALL use `/subscription/plans` as the GET endpoint URL for fetching all subscription plans.
2. WHEN a SuperAdmin creates a new plan, THE Subscription_API_Slice SHALL send a POST request to `/subscription/plans`.
3. WHEN a SuperAdmin updates an existing plan, THE Subscription_API_Slice SHALL send a PATCH request to `/subscription/plans/:id` where `:id` is the target plan identifier.
4. WHEN a SuperAdmin deletes a plan, THE Subscription_API_Slice SHALL send a DELETE request to `/subscription/plans/:id` where `:id` is the target plan identifier.
5. WHEN a SuperAdmin manages features for a plan, THE Subscription_API_Slice SHALL send a PATCH request to `/subscription/manage-features/:planId` where `:planId` is the target plan identifier.
6. THE Subscription_API_Slice SHALL preserve the existing RTK Query cache invalidation tag `SubscriptionPlans` for all migrated plan CRUD and feature management endpoints.
