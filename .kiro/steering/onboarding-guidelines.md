# Onboarding Flow Guidelines

## Overview
This document defines the complete onboarding flow architecture, implementation patterns, and guidelines for the Infinity MediSetu clinic onboarding process.

---

## Architecture Overview

### Onboarding Layout
- **File**: `src/Layouts/OnboardingLayout.tsx`
- **Purpose**: Specialized layout for onboarding process without sidebar
- **Features**:
  - Fixed header with logo, guidebook, theme toggle, help, notifications, and user profile
  - Left panel: Full-screen background image with overlaid logo and feature list
  - Right panel: Scrollable form content area
  - No sidebar (unlike MainLayout)
  - Guidebook tour integration

### Onboarding Flow Controller
- **File**: `src/pages/dashboard/NoClinicDash.tsx`
- **Purpose**: Orchestrates the multi-step onboarding process
- **Responsibilities**:
  - Step navigation and state management
  - API integration for saving progress
  - Validation and completion tracking
  - Approval status handling
  - Doctor vs Admin flow differentiation

---

## User Flow Types

### 1. Admin/Clinic Owner Flow
**Steps**: Profile → Clinic → Subscription → Verification

**Characteristics**:
- Has access to clinic creation
- Can set up clinic details
- Services and availability are optional (added later in main dashboard)
- Backend onboarding API tracking enabled
- Full clinic setup permissions

### 2. Doctor-Only Flow
**Steps**: Profile → Services → Availability → Subscription → Verification

**Characteristics**:
- No clinic step (doctors join existing clinics)
- Services and availability are required
- Backend onboarding API calls are **skipped** (doctors don't have clinic context)
- Uses session storage for submission tracking
- Simplified approval flow

---

## Step Definitions

### Step 1: Profile (Your Profile) 👤
**Component**: `src/components/onboarding/Overview.tsx`

**Fields**:
- Full Name (required)
- Personal Contact / Mobile Number (required, 10 digits)
- Alternate Contact (optional, 10 digits)
- Registration Number (required) - Medical registration ID
- Speciality (required) - Dropdown from `DOCTOR_SPECIALITIES`

**Validation**:
- Name: Non-empty string
- Mobile: Exactly 10 digits, numeric only
- Alternate: If provided, must be 10 digits
- Registration Number: Non-empty
- Speciality: Must be selected from dropdown

**API**: 
- Admin: `updateClinic` with `adminProfile` payload
- Doctor: `updateDoctor` with `doctorProfile` payload

**Completion Criteria**:
- All required fields saved
- Backend API call successful
- `onProfileComplete()` callback triggered

---

### Step 2: Clinic Details (Clinic Setup) 🏥
**Component**: `src/components/onboarding/ClinicDetails.tsx`

**Visibility**: Admin/Clinic Owner only (hidden for doctors)

**Fields**:
- Clinic Name (required)
- Clinic Inquiry Contact / Mobile Number (required, 10 digits)
- Tagline (optional)
- Clinic Logo (optional, max 3MB, JPG/PNG/JPEG/WEBP)
- Location Search (required)
- Map Pin Location (required)
- Complete Address:
  - House/Building/Road/Area (required)
  - City & State (required, dropdown)
  - Pincode (required, 6 digits)

**Validation**:
- Clinic Name: Non-empty
- Mobile: 10 digits
- Logo: Max 3MB, valid image format
- Location: Must be set on map
- Address: All fields required
- Pincode: Exactly 6 digits

**API**: `updateClinic` with clinic details

**Completion Criteria**:
- Clinic created with all required fields
- Location pinned on map
- `onClinicComplete()` callback triggered

---

### Step 3: Services & Pricing 💰
**Component**: `src/components/onboarding/ServicesPricingStep.tsx`

**Visibility**: Doctors only (hidden for admins who will set this up later)

**Fields** (per service):
- Service Name (required)
- Price (required, INR)
- Duration (required, in days)
- Additional Services (optional, textarea)

**Features**:
- Add multiple services
- Edit existing services
- Delete services
- Drag to reorder (optional)

**Validation**:
- At least 1 service must be added
- Service name: Non-empty
- Price: Positive number
- Duration: Positive number

**API**: `updateDoctor` with services array

**Completion Criteria**:
- At least 1 service saved
- All services have valid data
- `onServicesComplete()` callback triggered

---

### Step 4: Doctor Availability 📅
**Component**: `src/components/onboarding/DoctorAvailabilityStep.tsx`

**Visibility**: Doctors only

**Fields**:
- Working Days: Monday-Sunday checkboxes
- For each day:
  - Start Time (required if day is checked)
  - End Time (required if day is checked)
  - Slot Duration (required, in minutes)
  - Step Minutes (optional, buffer time)
  - Breaks (optional):
    - Break Type
    - Start Time
    - End Time
- Special Date Availability (optional):
  - Date picker
  - Available/Unavailable toggle
  - Time slots (if available)

**Validation**:
- At least 1 day must be selected
- End time must be after start time
- Slot duration must be positive
- Break times must be within working hours

**API**: `updateDoctor` with availability payload

**Completion Criteria**:
- At least 1 day configured with times
- All time validations pass
- `onAvailabilityComplete()` callback triggered

---

### Step 5: Review & Submit ✨
**Component**: `src/components/onboarding/ReviewSubmitStep.tsx`

**Purpose**: Final review and submission for verification

**Features**:
- Display summary of all entered information
- Edit links for each section
- Subscription plan selection
- Submit for review button

**Subscription Plans**:
- Free Plan (demo/trial)
- Premium Plans (various tiers)
- Payment integration (Razorpay)

**Submission Flow**:
1. Validate all previous steps are complete
2. For doctors: Ensure services and availability are saved
3. Call `submitOnboarding()` API (admins) or skip (doctors)
4. Show verification pending screen
5. Trigger `onSubscriptionComplete()` callback

---

## API Integration

### Onboarding Progress Tracking
**Endpoint**: `PUT /api/v1/users/onboarding/progress`

**Payload**:
```typescript
{
  currentStep: number,        // 0-based index of next step
  onboardingStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
}
```

**When to Call**:
- After each step completion (admins only)
- Update `currentStep` to next step index
- Set `onboardingStatus` to 'IN_PROGRESS' during onboarding
- Set `onboardingStatus` to 'COMPLETED' on final submission

**Important**: 
- **Doctors skip this API** (they don't have clinic context)
- Handle 404 errors gracefully (clinic not found)
- Only admins/clinic owners use progress tracking

### Submit for Verification
**Endpoint**: `POST /api/v1/users/onboarding/submit`

**Purpose**: Submit profile for admin approval

**When to Call**:
- Final step after all information is entered
- Only for admins (doctors skip this)

**Response**:
- Sets `approvalRequestSent: true`
- Updates `userStatus` (Pending/Active/Rejected)

---

## State Management

### Backend-Driven State
All onboarding state comes from API responses:

```typescript
// From clinic API
{
  profile: {
    userStatus: 'Pending' | 'Active' | 'Rejected',
    approvalRequestSent: boolean,
    onboardingStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED',
    currentStep: number
  },
  clinic: { /* clinic details */ }
}
```

**Rules**:
1. Never persist state in localStorage (except submission flag)
2. Always read from API response
3. Trust `currentStep` from backend for progress
4. Use `approvalRequestSent` to show verification screen

### Completion Tracking
**Completion Criteria** (per step):
- Step is completed if `currentStep > stepIndex`
- Use `isStepCompleted()` helper function
- Visual checkmarks based on `currentStep`, not data existence

**Example**:
```typescript
const isStepCompleted = (key: StepKey): boolean => {
  const stepIndex = steps.findIndex(s => s.key === key);
  return stepIndex >= 0 && backendCurrentStep > stepIndex;
};
```

---

## Approval Flow

### Verification Screen
**Component**: `src/components/onboarding/ApprovalPendingPanel.tsx`

**When to Show**:
- `approvalRequestSent === true` OR
- `showWaitingScreenAfterSubmit === true` (local state)

**Features**:
- Status display (Pending/Rejected)
- Re-check status button
- Update profile button (if rejected)
- Automatic status polling (every 30 seconds)

**Statuses**:
- **Pending**: Waiting for admin approval
- **Rejected**: Profile needs updates, user can edit and resubmit
- **Active**: Approved, redirect to dashboard

---

## Optimizations

### API Call Reduction
**Problem**: Too many redundant API calls during onboarding

**Solutions Implemented**:
1. **Disable Auto-Refetch**:
   ```typescript
   useGetAllClinicsQuery(undefined, {
     refetchOnMountOrArgChange: false,
     refetchOnFocus: false,
   });
   ```

2. **Reduced Polling**: 30s instead of 15s for approval status

3. **Cache-First**: Rely on RTK Query cache, no manual refetches

4. **Tag Invalidation**: Only invalidate relevant tags
   - Doctor mutations only invalidate `["Doctor"]`
   - Not `["Doctor", "User", "Clinic"]`

5. **Skip Unnecessary Calls**:
   - Doctors skip onboarding progress API
   - Doctors skip submit onboarding API

**Result**: ~78% reduction in API calls

---

## Scrolling Behavior

### Requirements
- Left image panel: **Fixed, no scroll**
- Right form panel: **Independent scrolling**
- Overall page: **No scroll** (overflow-hidden)

### Implementation
```css
/* Root container */
.root { 
  h-screen overflow-hidden 
}

/* Main split container */
.main-container { 
  fixed top-16 left-0 right-0 bottom-0 
}

/* Left panel (image) */
.left-panel { 
  h-full overflow-hidden 
}

/* Right panel (form) */
.right-panel { 
  h-full overflow-y-auto 
}
```

**Key Points**:
- Root has `overflow-hidden` to prevent body scroll
- Main container uses `fixed` positioning to fill viewport
- Only right panel has `overflow-y-auto`
- Left panel uses `overflow-hidden` (no scroll)

---

## Design Guidelines

### Left Sidebar (Image Panel)
**Structure**:
- Full background image (onboarding_img.png)
- Dark gradient overlay (black 40-70% opacity)
- White text overlay
- Logo at top
- "Let's set up your clinic" heading (centered)
- 3 feature cards with icons
- Help button at bottom

**Styling**:
- Width: 280px (lg), 320px (xl)
- All text: white color
- Icon backgrounds: semi-transparent with backdrop blur
- Not scrollable
- Hidden on mobile

### Right Form Area
**Structure**:
- White background (light) / dark background (dark mode)
- Max width: 5xl (80rem)
- Centered with horizontal padding
- Scrollable content

**Form Styling**:
- Use shared components: `PillInput`, `SelectField`, `AutocompleteField`
- Consistent spacing: gap-4 between fields
- Grid layout: 1 column (mobile), 2-3 columns (desktop)
- Save & Continue button: Primary color, right-aligned

### Progress Stepper
**Component**: `AnimatedFormStepper.tsx`

**Features**:
- Horizontal dot stepper
- Active step: pulsing ring, larger dot
- Completed steps: checkmark icon
- Disabled steps: grayed out
- Smooth animations with framer-motion
- Connecting lines between dots
- Labels below each dot

**Styling**:
- Active dot: 18px, primary color, pulsing ring
- Completed dot: 14px, primary color, checkmark
- Inactive dot: 10px, gray
- Line: 2px height, fills on completion

---

## Guidebook Integration

### Interactive Tour
**Component**: `src/components/shared/TourGuide/OnboardingTour.tsx`

**Features**:
- 9-step interactive tour
- Driver.js powered
- Highlights each UI element
- Progress indicator
- Next/Previous navigation
- Close button

**Tour Steps**:
1. Welcome message (center overlay)
2. Progress stepper explanation
3. Profile step details
4. Clinic step details
5. Services step details
6. Availability step details
7. Subscription step details
8. Form filling instructions
9. Completion message

**Activation**:
- Click guidebook icon (📖) in header
- Auto-starts with smooth animation
- Can be restarted anytime

**Styling**:
- Custom theme: "onboarding-tour"
- Primary color accents
- Rounded corners (16px)
- Gradient buttons
- Dark mode support
- Box shadow with primary color

**DOM Targets**:
```typescript
#onboarding-stepper      → Progress tracker
#onboarding-form-content → Form area
#step-profile            → Profile step dot
#step-clinic             → Clinic step dot
#step-services           → Services step dot
#step-availability       → Availability step dot
#step-subscription       → Subscription step dot
```

---

## Error Handling

### Common Errors

#### 1. 404 - Clinic Not Found
**Cause**: Doctor-only users don't have clinic context

**Solution**: 
- Skip onboarding progress API calls for doctors
- Use session storage for tracking
- Show verification screen without API call

**Implementation**:
```typescript
if (isDoctorUser) {
  console.log('[Onboarding] Skipping progress update for doctor-only user');
  return;
}
```

#### 2. Validation Errors
**Cause**: Missing required fields or invalid data

**Solution**:
- Show inline error messages (red text)
- Highlight invalid fields
- Scroll to first error
- Prevent form submission until valid

#### 3. Upload Failures
**Cause**: Image too large, invalid format, or network error

**Solution**:
- Check file size before upload (max 3MB)
- Validate file type (JPG, PNG, JPEG, WEBP)
- Show user-friendly error message
- Provide retry option

---

## Testing Guidelines

### Manual Testing Checklist
- [ ] Admin flow completes all steps
- [ ] Doctor flow skips clinic step
- [ ] Progress saves after each step
- [ ] Can navigate back to edit previous steps
- [ ] Form validation works on all fields
- [ ] Logo upload works (valid file)
- [ ] Logo upload fails gracefully (invalid file)
- [ ] Map location can be set
- [ ] Services can be added, edited, deleted
- [ ] Availability can be configured for multiple days
- [ ] Breaks can be added to availability
- [ ] Subscription selection works
- [ ] Submit for review triggers verification screen
- [ ] Approval status updates correctly
- [ ] Rejected status allows profile update
- [ ] Active status redirects to dashboard
- [ ] Guidebook tour starts and completes
- [ ] All tour steps highlight correct elements
- [ ] Left panel stays fixed while form scrolls
- [ ] Dark mode works throughout
- [ ] Mobile responsive (stacks correctly)

### Automated Testing
**Test Files** (to be created):
- `OnboardingLayout.test.tsx`
- `NoClinicDash.test.tsx`
- `AnimatedFormStepper.test.tsx`
- `OnboardingTour.test.tsx`

**Test Cases**:
- Step navigation
- Form validation
- API integration
- State management
- Error handling
- Responsive behavior

---

## Troubleshooting

### Issue: Steps marked complete prematurely
**Cause**: Using data existence instead of `currentStep`

**Solution**: Always check `backendCurrentStep > stepIndex`

### Issue: Doctor onboarding fails with 404
**Cause**: Calling progress API without clinic context

**Solution**: Skip progress API for doctor users

### Issue: Form content scrolls with image
**Cause**: Incorrect overflow settings

**Solution**: Review scrolling implementation section above

### Issue: Tour doesn't highlight elements
**Cause**: Missing DOM IDs

**Solution**: Ensure all target elements have correct IDs

### Issue: Progress lost on refresh
**Cause**: Relying on local state instead of backend

**Solution**: Always read from API on mount

---

## Best Practices

### Do's ✅
- Always read state from backend API
- Handle 404 errors gracefully for doctors
- Use shared components for consistency
- Validate all user inputs
- Show clear error messages
- Provide helpful tooltips
- Test in both light and dark modes
- Optimize API calls (disable unnecessary refetches)
- Use semantic HTML
- Follow accessibility guidelines

### Don'ts ❌
- Don't persist onboarding state in localStorage
- Don't use data existence to mark steps complete
- Don't call onboarding APIs for doctor-only users
- Don't create new components when shared ones exist
- Don't hardcode colors (use design tokens)
- Don't forget dark mode styling
- Don't skip validation
- Don't make unnecessary API calls
- Don't forget mobile responsive design
- Don't ignore TypeScript errors

---

## File Structure

```
src/
├── Layouts/
│   └── OnboardingLayout.tsx          # Onboarding-specific layout
├── pages/
│   └── dashboard/
│       └── NoClinicDash.tsx          # Onboarding controller
├── components/
│   ├── onboarding/
│   │   ├── AnimatedFormStepper.tsx   # Progress stepper
│   │   ├── Overview.tsx              # Profile step
│   │   ├── ClinicDetails.tsx         # Clinic step
│   │   ├── ServicesPricingStep.tsx   # Services step
│   │   ├── DoctorAvailabilityStep.tsx# Availability step
│   │   ├── ReviewSubmitStep.tsx      # Review step
│   │   ├── ApprovalPendingPanel.tsx  # Verification screen
│   │   ├── ClinicSetupPanels.tsx     # Step router
│   │   ├── CompletionPopup.tsx       # Success modal
│   │   └── types.ts                  # Type definitions
│   └── shared/
│       └── TourGuide/
│           ├── OnboardingTour.tsx    # Onboarding tour
│           ├── SiteTour.tsx          # Main app tour
│           └── index.ts              # Exports
├── redux/
│   └── api/
│       ├── authApi.ts                # Onboarding progress, submit
│       ├── clinicApi.ts              # Clinic CRUD
│       └── doctorApi.ts              # Doctor profile, services, availability
└── utils/
    └── clinicSetupStatus.ts          # Setup status helpers
```

---

## Dependencies

### Required Libraries
- **React 19**: Core framework
- **React Router v7**: Navigation
- **Redux Toolkit**: State management
- **RTK Query**: API calls and caching
- **React Hook Form**: Form management
- **Zod**: Form validation
- **HeroUI**: UI components
- **Tailwind CSS**: Styling
- **Framer Motion**: Animations
- **Driver.js**: Guided tour
- **react-icons**: Icon library

### API Dependencies
- Clinic API: Clinic CRUD operations
- Doctor API: Doctor profile, services, availability
- Auth API: Onboarding progress, submission, approval

---

## Performance Considerations

### Optimization Strategies
1. **Lazy Loading**: Not needed (onboarding is critical path)
2. **Code Splitting**: Separate onboarding bundle from main app
3. **Image Optimization**: Compress onboarding_img.png
4. **API Caching**: Leverage RTK Query cache
5. **Debouncing**: Debounce form inputs (especially search)
6. **Memoization**: Use `useMemo` for expensive computations
7. **Polling**: Limit to 30s interval for status checks

### Metrics to Track
- Time to complete onboarding
- API call count per session
- Error rate by step
- Abandonment rate by step
- Time spent per step

---

## Accessibility

### ARIA Labels
- All buttons have `aria-label` attributes
- Form inputs have associated labels
- Error messages use `aria-describedby`
- Progress stepper uses `aria-current`

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Tab order is logical
- Enter key submits forms
- Escape key closes modals

### Screen Readers
- Semantic HTML (heading hierarchy)
- Alt text for images
- Status announcements with `aria-live`
- Form validation announcements

### Color Contrast
- All text meets WCAG AA standards (4.5:1)
- Interactive elements have clear focus indicators
- Error messages use color + icon (not color alone)

---

## Security Considerations

### Data Validation
- Server-side validation for all inputs
- Sanitize user inputs before storage
- Validate file uploads (type, size)
- Check image dimensions

### Authentication
- Verify user is logged in before allowing onboarding
- Check user permissions for each step
- Validate session tokens on API calls

### File Uploads
- Limit file size (3MB)
- Validate MIME type
- Scan for malicious content
- Store in secure location

---

## Future Enhancements

### Planned Features
1. **Multi-language Support**: i18n for global markets
2. **Video Tutorials**: Embed help videos in each step
3. **Progress Persistence**: Save draft as user types
4. **Smart Suggestions**: Auto-fill from clinic database
5. **Bulk Import**: Import services from CSV
6. **Calendar Integration**: Sync availability with Google Calendar
7. **Mobile App**: Native app for onboarding
8. **Analytics Dashboard**: Track onboarding metrics
9. **A/B Testing**: Test different onboarding flows
10. **Gamification**: Badges, progress rewards

### Improvement Ideas
- Auto-save form progress every 30s
- Predictive text for common service names
- Map integration with street view
- Real-time availability preview
- Comparison with similar clinics
- Onboarding completion checklist email

---

## Support Resources

### Documentation
- **User Guide**: `ONBOARDING_GUIDEBOOK.md`
- **Technical Docs**: `ONBOARDING_GUIDEBOOK_IMPLEMENTATION.md`
- **API Docs**: Check backend documentation

### Help & Support
- **In-App Help**: Click help icon in header
- **Guided Tour**: Click guidebook icon
- **Support Email**: support@infinitymedisetu.com
- **Support Phone**: Available 24×7

### Training Materials
- Video walkthroughs
- Screenshot tutorials
- FAQ document
- Troubleshooting guide

---

## Change Log

### v1.0 - January 2026
- Initial onboarding flow implementation
- Admin and doctor flows
- Progress tracking
- Approval system
- Guidebook tour
- Comprehensive documentation

---

## Summary

The onboarding flow is designed to be:
- **Quick**: 10-15 minutes to complete
- **Easy**: Guided tour and clear instructions
- **Flexible**: Different flows for admins and doctors
- **Robust**: Error handling and validation
- **Optimized**: Minimal API calls, fast performance
- **Accessible**: WCAG compliant
- **Responsive**: Works on all devices

Follow these guidelines to maintain consistency and quality when working on onboarding-related features.

---

*Last Updated: January 2026*  
*Version: 1.0*  
*Maintained by: Development Team*
