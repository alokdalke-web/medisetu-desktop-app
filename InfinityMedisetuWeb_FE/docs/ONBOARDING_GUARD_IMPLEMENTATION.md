# Onboarding Guard Implementation

## Overview
Implemented a route guard in `MainLayout.tsx` to prevent users from accessing other pages while their onboarding is in progress. This ensures users complete the clinic setup process before accessing the dashboard and other features.

## Changes Made

### 1. Fixed TypeScript Errors (6 errors)
Removed unused variables and imports that were blocking the git pre-push hook:

- **AnimatedFormStepper.tsx**: Removed unused `activeIndex` variable
- **Overview.tsx**: Removed unused imports `FiUser` and `FiAward`
- **ServicesPricingStep.tsx**: Removed unused imports `FiActivity` and `FiInfo`
- **InteractiveMap.tsx**: Removed unused `mapContainerStyle` constant
- **NoClinicDash.tsx**: Removed unused `stepLabel` variable

### 2. Added Onboarding Guard in MainLayout.tsx

Added a route guard that:
- ✅ Checks if `onboardingStatus` is `IN_PROGRESS` or `NOT_STARTED`
- ✅ Only applies to Admin and Doctor users (not Receptionist, Pharmacist, Lab_Assistant, etc.)
- ✅ Redirects to `/clinic-setup` if user tries to access other routes during onboarding
- ✅ Allows access once `approvalRequestSent` is `true`
- ✅ Allows access once user status becomes `active`

## How It Works

### API Response Example
```json
{
  "clinic": {
    "onboardingStatus": "IN_PROGRESS",
    "approvalRequestSent": false,
    "currentStep": 1
  },
  "profile": {
    "userStatus": "Pending",
    "onboardingStatus": "IN_PROGRESS",
    "approvalRequestSent": false,
    "currentStep": 1
  }
}
```

### Guard Logic
```typescript
const onboardingStatus = clinicProfile?.onboardingStatus || user?.onboardingStatus;
const approvalRequestSent = clinicProfile?.approvalRequestSent ?? false;
const isOnboardingInProgress = onboardingStatus === 'IN_PROGRESS' || onboardingStatus === 'NOT_STARTED';
const isOnboardingRoute = location.pathname === "/clinic-setup";
const shouldEnforceOnboarding = isAdmin || isDoctor;
const isUserActive = normalizeStatus(userStatus) === "active";

// Redirect to /clinic-setup if:
// 1. Onboarding is in progress
// 2. User is not already on the clinic-setup page
// 3. User is Admin or Doctor
// 4. User has NOT submitted approval request
// 5. User is NOT already active
if (isOnboardingInProgress && !isOnboardingRoute && shouldEnforceOnboarding && !approvalRequestSent && !isUserActive) {
  return <Navigate to="/clinic-setup" replace />;
}
```

## User Flow

### Case 1: New User (onboardingStatus: NOT_STARTED)
1. User logs in
2. MainLayout detects `onboardingStatus === 'NOT_STARTED'`
3. User is redirected to `/clinic-setup`
4. User completes onboarding steps
5. Backend updates `currentStep` and `onboardingStatus` to `IN_PROGRESS`

### Case 2: Onboarding In Progress
1. User is at step 2 of onboarding
2. API returns `onboardingStatus: 'IN_PROGRESS'`, `currentStep: 1`
3. User tries to navigate to `/dashboard` or `/patients`
4. MainLayout guard redirects back to `/clinic-setup`
5. User sees the onboarding form at step 2

### Case 3: Submitted for Approval
1. User completes all onboarding steps
2. Backend updates `approvalRequestSent: true`
3. User can now access `/clinic-setup` showing "Approval Pending" screen
4. Guard no longer blocks navigation (but user sees limited functionality until approved)

### Case 4: Approved User
1. Admin approves the user
2. Backend updates `userStatus: 'Active'`
3. Guard no longer blocks navigation
4. User has full access to all features

## Testing Checklist

- [x] TypeScript compilation passes without errors
- [ ] User with `onboardingStatus: 'IN_PROGRESS'` is redirected to `/clinic-setup`
- [ ] User with `onboardingStatus: 'NOT_STARTED'` is redirected to `/clinic-setup`
- [ ] User with `approvalRequestSent: true` can access other pages
- [ ] User with `userStatus: 'Active'` can access all pages
- [ ] Receptionist/Pharmacist/Lab users are NOT affected by the guard
- [ ] Navigation from within `/clinic-setup` works correctly
- [ ] Direct URL access (e.g., typing `/dashboard` in browser) is blocked during onboarding

## Files Modified

1. `src/Layouts/MainLayout.tsx` - Added onboarding guard logic
2. `src/components/onboarding/AnimatedFormStepper.tsx` - Removed unused variable
3. `src/components/onboarding/Overview.tsx` - Removed unused imports
4. `src/components/onboarding/ServicesPricingStep.tsx` - Removed unused imports
5. `src/components/shared/InteractiveMap.tsx` - Removed unused constant
6. `src/pages/dashboard/NoClinicDash.tsx` - Removed unused variable

## Backend Requirements

The backend must provide these fields in the API response:

```typescript
{
  clinic: {
    onboardingStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    approvalRequestSent: boolean;
    currentStep: number;
  },
  profile: {
    userStatus: 'Pending' | 'Active' | 'Rejected' | 'Blocked';
    onboardingStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    approvalRequestSent: boolean;
    currentStep: number;
  }
}
```

## Notes

- The guard only affects Admin and Doctor users
- Other user types (Receptionist, Pharmacist, Lab_Assistant, Patient) are not affected
- The guard respects the backend state - no frontend-only flags
- Users can still access `/clinic-setup` even after approval (to update their information)
- The guard uses `<Navigate replace />` to prevent back button issues
