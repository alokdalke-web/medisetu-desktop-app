# Requirements Document

## Introduction

This feature integrates the plan limitations API (`GET /api/v1/users/limitations/overview`) into the MediSetu frontend application. The integration controls UI behavior (enable, disable, or modify component behavior) based on the current plan's feature limits. The system fetches limitation data once at app initialization, caches it in the Redux store via RTK Query, and only refetches when limit-relevant events occur (plan upgrade, doctor added, etc.). The integration must not cause unnecessary re-renders or interfere with unrelated application processes.

## Glossary

- **Limitations_Service**: The RTK Query API slice responsible for fetching, caching, and providing plan limitation data from the backend endpoint `/users/limitations/overview`.
- **Feature_Limit**: A single entry in the limitations response representing a specific feature's access state, including its enabled status, usage cap, current usage, and remaining quota.
- **Limitation_Cache**: The RTK Query cache entry holding the limitations overview response, managed with `keepUnusedDataFor` to persist data across the application lifecycle.
- **Feature_Gate**: A React hook or component that reads limitation data and determines whether a UI feature should be fully enabled, disabled, or shown in a limit-reached state.
- **Limit_Relevant_Event**: An application event that changes plan limitations data, such as a plan upgrade, plan downgrade, doctor account creation, doctor account removal, or receptionist account change.
- **Upgrade_Prompt**: A UI element displayed to the user when a feature is enabled but the usage limit has been reached, guiding the user toward a plan upgrade.

## Requirements

### Requirement 1: Fetch Limitations Data

**User Story:** As a clinic administrator, I want the application to load my plan limitations once at startup, so that the UI reflects my current plan without repeated API calls.

#### Acceptance Criteria

1. WHEN the authenticated user session is initialized, THE Limitations_Service SHALL make exactly one GET request to `/users/limitations/overview` with the user's Bearer token.
2. THE Limitations_Service SHALL cache the response in the Redux store using RTK Query's built-in caching mechanism with `keepUnusedDataFor` set to infinity (maximum cache duration).
3. WHILE the Limitation_Cache contains valid data, THE Limitations_Service SHALL serve subsequent data access requests from the cache without making additional network requests.
4. IF the GET request to `/users/limitations/overview` fails with a network error or non-2xx status, THEN THE Limitations_Service SHALL retain any previously cached data and expose the error state to consuming components.
5. WHILE the user is not authenticated (no valid token), THE Limitations_Service SHALL not make any request to the limitations endpoint.

### Requirement 2: Cache Invalidation on Limit-Relevant Events

**User Story:** As a clinic administrator, I want the limitations data to refresh automatically when I upgrade my plan or add a doctor, so that the UI immediately reflects my new limits.

#### Acceptance Criteria

1. WHEN a plan subscription mutation succeeds (subscribe, verify payment), THE Limitations_Service SHALL invalidate the Limitation_Cache and refetch the limitations data.
2. WHEN a doctor account is created or removed, THE Limitations_Service SHALL invalidate the Limitation_Cache and refetch the limitations data.
3. WHEN a receptionist account is created or removed, THE Limitations_Service SHALL invalidate the Limitation_Cache and refetch the limitations data.
4. THE Limitations_Service SHALL use RTK Query tag invalidation to trigger refetch, ensuring only the limitations query is re-executed without affecting other cached API data.
5. WHILE a refetch is in progress, THE Limitations_Service SHALL continue serving the previously cached data until the new response is received.

### Requirement 3: Feature Gate — Disabled Features

**User Story:** As a clinic administrator on a free plan, I want features I don't have access to be visually disabled, so that I understand what is available on higher plans.

#### Acceptance Criteria

1. WHEN a Feature_Limit has `enabled` equal to `false`, THE Feature_Gate SHALL indicate that the feature is disabled.
2. WHEN a feature is disabled, THE Feature_Gate SHALL provide metadata (feature description) that consuming components can use to display contextual information about the locked feature.
3. THE Feature_Gate SHALL expose a consistent interface (hook) that any component can use to check a feature's access state by its `featureKey` string.

### Requirement 4: Feature Gate — Limit Reached State

**User Story:** As a clinic administrator who has used all my doctor account slots, I want to see that I've reached my limit and be prompted to upgrade, so that I know how to get more capacity.

#### Acceptance Criteria

1. WHEN a Feature_Limit has `enabled` equal to `true` AND `remaining` equal to `0` AND `isUnlimited` equal to `false`, THE Feature_Gate SHALL indicate that the feature has reached its usage limit.
2. WHEN a feature is in the limit-reached state, THE Feature_Gate SHALL provide the `limitValue` and `currentUsage` values so consuming components can display usage information.
3. WHEN a feature is in the limit-reached state, THE consuming component SHALL display an Upgrade_Prompt guiding the user to upgrade their plan.

### Requirement 5: Feature Gate — Fully Accessible Features

**User Story:** As a clinic administrator with available quota, I want features to work normally without any restrictions, so that I can use the application without interruption.

#### Acceptance Criteria

1. WHEN a Feature_Limit has `enabled` equal to `true` AND `remaining` greater than `0`, THE Feature_Gate SHALL indicate that the feature is fully accessible.
2. WHEN a Feature_Limit has `enabled` equal to `true` AND `isUnlimited` equal to `true`, THE Feature_Gate SHALL indicate that the feature is fully accessible regardless of the `remaining` value.
3. WHILE a feature is fully accessible, THE Feature_Gate SHALL not render any restriction indicators or Upgrade_Prompts for that feature.

### Requirement 6: Render Performance Isolation

**User Story:** As a user navigating the application, I want the limitations system to not cause unnecessary re-renders or slow down unrelated parts of the app, so that my experience remains smooth.

#### Acceptance Criteria

1. THE Feature_Gate hook SHALL use selector-based subscriptions (RTK Query `selectFromResult` or equivalent) so that a component only re-renders when the specific Feature_Limit it depends on changes.
2. THE Limitations_Service SHALL not trigger re-renders in components that do not consume limitation data.
3. WHEN the Limitation_Cache is invalidated and refetched, THE Limitations_Service SHALL only cause re-renders in components that subscribe to a Feature_Limit whose value has changed in the new response.
4. THE Limitations_Service SHALL be registered as a separate RTK Query API slice with its own `reducerPath`, ensuring its cache invalidation does not affect other API slices (subscriptionApi, clinicApi, etc.).

### Requirement 7: Plan Metadata Access

**User Story:** As a developer, I want to access the current plan information (planId, planSlug) from the limitations response, so that I can display plan-specific UI elements.

#### Acceptance Criteria

1. THE Limitations_Service SHALL expose the `plan` object (containing `planId` and `planSlug`) from the limitations response alongside the feature limits data.
2. WHEN a component needs to display the current plan name or identifier, THE Limitations_Service SHALL provide the `planSlug` value from the cached response without requiring an additional API call.

### Requirement 8: Feature Key Type Safety

**User Story:** As a developer, I want feature keys to be type-safe constants, so that I avoid typos and get IDE autocompletion when checking feature access.

#### Acceptance Criteria

1. THE Limitations_Service SHALL define a TypeScript union type or enum containing all known feature keys: `dashboard_full_access`, `doctor_accounts`, `lab_integration`, `payment_history_months`, `pharmacy_integration`, `priority_support`, `receptionist_accounts`, `reports_analytics`, `smart_prescriptions`, `storage_months`, `whatsapp_messages_per_month`.
2. THE Feature_Gate hook SHALL accept only valid feature key values as defined by the TypeScript type, producing a compile-time error for unknown keys.
3. WHEN new feature keys are added to the API response, THE type definition SHALL be the single location that needs updating to support the new key.
