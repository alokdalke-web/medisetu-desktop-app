# Onboarding Guard Test Scenarios

## Test Setup
The onboarding guard is located in `src/Layouts/MainLayout.tsx` and uses the following API response data:

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

## Test Scenarios

### ✅ Scenario 1: User at Step 1 tries to access /dashboard
**Given:**
- User type: Admin
- onboardingStatus: `IN_PROGRESS`
- currentStep: 1
- approvalRequestSent: false
- userStatus: Pending

**When:** User navigates to `/dashboard`

**Expected Result:** User is redirected to `/clinic-setup`

**Verification:**
1. Open browser DevTools Network tab
2. Navigate to `/dashboard`
3. Check that URL changes to `/clinic-setup`
4. Verify no flash of dashboard content

---

### ✅ Scenario 2: User at Step 3 refreshes page
**Given:**
- User type: Doctor
- onboardingStatus: `IN_PROGRESS`
- currentStep: 3
- approvalRequestSent: false
- userStatus: Pending

**When:** User refreshes the page at `/clinic-setup`

**Expected Result:** 
- User stays on `/clinic-setup`
- Form shows step 3 (Availability or Services depending on role)
- No redirect occurs

**Verification:**
1. Complete steps 1-2 of onboarding
2. Be on step 3
3. Press F5 to refresh
4. Verify still on step 3

---

### ✅ Scenario 3: User completes all steps and submits
**Given:**
- User type: Admin
- onboardingStatus: `COMPLETED` (backend updated)
- currentStep: 4
- approvalRequestSent: true (backend updated)
- userStatus: Pending

**When:** User completes final step and clicks "Submit for Approval"

**Expected Result:** 
- API call to submit onboarding
- Backend updates `approvalRequestSent: true`
- User sees "Approval Pending" screen
- User can now navigate away from `/clinic-setup` (but sees limited dashboard)

**Verification:**
1. Complete all onboarding steps
2. Click "Submit for Approval"
3. Verify "Approval Pending" screen appears
4. Try navigating to `/dashboard` - should NOT redirect back
5. Dashboard should show limited view or "waiting for approval" banner

---

### ✅ Scenario 4: User tries direct URL access during onboarding
**Given:**
- User type: Doctor
- onboardingStatus: `IN_PROGRESS`
- currentStep: 2
- approvalRequestSent: false
- userStatus: Pending

**When:** User types `/patients` directly in browser address bar

**Expected Result:** User is redirected to `/clinic-setup`

**Verification:**
1. Log in as Doctor in onboarding
2. Type `/patients` in address bar
3. Press Enter
4. Verify redirect to `/clinic-setup`

---

### ✅ Scenario 5: Approved user with IN_PROGRESS status (edge case)
**Given:**
- User type: Admin
- onboardingStatus: `IN_PROGRESS` (not updated)
- currentStep: 1
- approvalRequestSent: true
- userStatus: `Active` (admin manually approved)

**When:** User navigates to `/dashboard`

**Expected Result:** 
- Guard allows access because `userStatus === 'Active'`
- User can access all features
- This handles edge case where backend didn't update onboardingStatus

**Verification:**
1. Simulate approval with backend setting userStatus to 'Active'
2. Navigate to `/dashboard`
3. Verify access granted
4. Verify no redirect

---

### ✅ Scenario 6: Receptionist user (should NOT be affected)
**Given:**
- User type: Receptionist
- onboardingStatus: `IN_PROGRESS` (doesn't matter)
- currentStep: 0
- approvalRequestSent: false
- userStatus: Active

**When:** User navigates to `/appointment`

**Expected Result:** 
- Guard does NOT redirect
- Receptionist can access all pages
- Onboarding guard only applies to Admin/Doctor

**Verification:**
1. Log in as Receptionist
2. Navigate to any page
3. Verify no redirects occur
4. Guard is bypassed for non-Admin/Doctor users

---

### ✅ Scenario 7: User at /clinic-setup tries to navigate via sidebar
**Given:**
- User type: Admin
- onboardingStatus: `IN_PROGRESS`
- currentStep: 2
- approvalRequestSent: false
- userStatus: Pending
- Current page: `/clinic-setup`

**When:** User clicks "Patients" in sidebar

**Expected Result:** 
- Click event fires
- Navigation attempt to `/patients`
- Guard intercepts and redirects back to `/clinic-setup`

**Verification:**
1. Be on onboarding page
2. Click sidebar menu item
3. Verify redirect back to `/clinic-setup`
4. No navigation occurs

---

### ✅ Scenario 8: Browser back button during onboarding
**Given:**
- User type: Doctor
- onboardingStatus: `IN_PROGRESS`
- currentStep: 2
- approvalRequestSent: false
- userStatus: Pending
- User previously at `/login`, then `/clinic-setup`

**When:** User clicks browser back button

**Expected Result:** 
- Browser navigates to `/login`
- Login page redirects authenticated user to dashboard
- Guard intercepts and redirects to `/clinic-setup`

**Verification:**
1. Log in (goes to `/clinic-setup`)
2. Click browser back button
3. Verify ends up at `/clinic-setup` (guard catches redirect)

---

## Manual Testing Checklist

Before considering this feature complete, verify:

- [ ] Scenario 1: Dashboard access blocked during onboarding
- [ ] Scenario 2: Page refresh preserves onboarding state
- [ ] Scenario 3: Submission allows navigation away
- [ ] Scenario 4: Direct URL access is blocked
- [ ] Scenario 5: Active users bypass guard (edge case)
- [ ] Scenario 6: Non-Admin/Doctor users unaffected
- [ ] Scenario 7: Sidebar navigation blocked
- [ ] Scenario 8: Back button handled correctly

## Automated Testing (Future)

To create automated tests for this guard, consider:

```typescript
// Example test structure
describe('OnboardingGuard', () => {
  it('should redirect to /clinic-setup when onboarding is IN_PROGRESS', () => {
    // Mock API response with IN_PROGRESS status
    // Render MainLayout with router
    // Assert redirect occurred
  });

  it('should allow access after approvalRequestSent is true', () => {
    // Mock API response with approvalRequestSent: true
    // Render MainLayout with router
    // Assert no redirect occurred
  });

  // ... more tests
});
```

## Notes for QA Team

1. **Test with different user roles**: Admin, Doctor, Receptionist, Pharmacist, Lab_Assistant
2. **Test with different API states**: NOT_STARTED, IN_PROGRESS, COMPLETED
3. **Test approval flow**: Pending → Active status
4. **Test edge cases**: Network errors, stale data, race conditions
5. **Test on different browsers**: Chrome, Firefox, Safari, Edge
6. **Test mobile responsiveness**: Onboarding should work on mobile devices too
