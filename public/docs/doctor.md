# Doctor Guide

Your MediSetu workspace is built around clinical workflow — managing appointments, conducting consultations, writing prescriptions, ordering lab tests, reviewing results, and controlling your availability.

---

## Dashboard

Your landing page with a real-time view of your practice.

### Key Metrics

| Metric | What It Shows |
|--------|---------------|
| **Total Earnings** | Revenue from consultations with growth % |
| **Total Appointments** | Cumulative bookings with period comparison |
| **Confirmed Appointments** | Visits confirmed, awaiting patient arrival |
| **Pending Appointments** | Not yet confirmed, may need follow-up |

### Charts & Panels

- **Appointment Statistics** — Completed vs cancelled by month
- **Pending Queue** — Patients scheduled but not yet checked in
- **Patient Queue** — Checked-in patients physically waiting (live updates)
- **Recent Patients** — Quick access to latest consultations

### Call Reception Button

In the header, use this to alert the front desk:
- **General Call** — Need front-desk assistance
- **Next Patient** — Ready to see whoever is next in queue

---

## Appointments

View your schedule as a **list** (sorted by time) or **calendar** (color-coded status blocks).

### Filtering

Filter by date range, status (Scheduled / In Progress / Completed / Cancelled / No-Show), or search by patient name/phone.

### Appointment Detail View

Each appointment contains:
- Patient information
- Activity history (audit trail)
- Prescription, lab reports, gallery
- Consent documents, medical certificate, additional services

### Available Actions

| Action | Description |
|--------|-------------|
| **Start Consultation** | Opens workspace (only when patient is checked in) |
| **Reschedule** | Move to different date/time |
| **Cancel** | Mandatory reason saved to history |
| **Mark No-Show** | Patient didn't arrive |
| **Add Notes** | Pre-visit prep or post-visit observations |
| **Upload Consent** | Attach signed consent before procedures |
| **Add Services** | Bill additional procedures |

---

## Conducting a Consultation

When a patient is checked in by reception, click **Start Consultation** to open the consultation workspace.

### Vitals Recording

| Field | Unit |
|-------|------|
| Blood Pressure | Systolic/Diastolic mmHg |
| Temperature | °C or °F |
| Heart Rate | BPM |
| Respiratory Rate | Breaths/min |
| Weight | Kg |
| Height | cm |
| BMI | Auto-calculated |
| Oxygen Saturation | % |
| Blood Glucose | mg/dL |

### Consultation Fields

- **Chief Complaints** — Symptoms, duration, severity, observations
- **Diagnoses** — Free text or standardized codes (multiple supported)
- **Prescription** — Built directly in the consultation (see Prescriptions section)
- **Lab Orders** — Order tests from catalog without leaving the screen
- **Clinical Notes** — Examination findings, referral instructions, lifestyle advice
- **Follow-up** — Set recommended next appointment date

### Finishing Up

- **Visit Summary** — Printable summary with vitals, diagnosis, prescriptions, lab orders
- **Medical Certificate** — Generate with condition, rest days, and notes (linked to appointment)
- **Gallery** — Upload clinical images with descriptions during consultation

---

## Patient Records

Each patient has a comprehensive profile that builds over time.

### What's in a Patient Profile

Personal details, medical history, allergies (with severity/reaction), current medications, all past consultations, every prescription, all lab reports, gallery images, and no-show history.

### Timeline View

All visits displayed chronologically. Click any entry to expand full details from that consultation.

### Tabs

- **Timeline** — All consultations chronologically
- **Lab Reports** — All test results
- **Prescriptions** — Every prescription
- **Gallery** — All clinical images

> Tip: Open the patient's full profile before they walk in. Thirty seconds reviewing allergies, medications, and last visit dramatically improves consultation quality.

---

## Prescriptions

Two modes available — toggle at **Profile → Prescription Preference**.

### Digital Mode (In-App Builder)

1. Search medicines by brand name or generic composition
2. Set strength, frequency, duration, route, special instructions
3. Add multiple medicines to same prescription
4. System generates formatted PDF

### Manual Mode (Handwriting Scanner)

1. Write prescription by hand on paper
2. Click **Switch to Phone** to open phone camera
3. Capture the handwritten prescription
4. AI digitizes and saves to patient record

### Templates

Create reusable templates at **Profile → Prescription Templates** for common diagnoses (e.g., "Viral Fever 3-day", "Hypertension Follow-up"). During consultation, select a template to auto-fill all medicines, then adjust for the specific patient.

> Tip: Templates typically save 3–5 minutes per consultation. Set up templates for your top 10 most common diagnoses.

### Medicine Library

At **Profile → Medicines** — search, view details, mark favorites for one-click access during consultations. Add new medicines from **Profile → Medicines → Setup**.

### Delivery Options

Print, email as PDF, SMS download link, or store digitally in patient profile.

---

## Lab Tests

### Ordering Tests

During consultation → **Order Tests** → browse by category or search by name/code → add special instructions → confirm. Lab assistant receives the order instantly.

### Tracking Orders

**Pending Tests** view shows all your orders with status: Ordered → Sample Collected → In Progress → Completed.

### Reviewing Results

- Abnormal values highlighted in red
- Critical values trigger immediate in-app notification
- Download individual or batch reports as PDF
- Share results directly with patient (email/phone)
- **Compare Results** — Side-by-side comparisons across dates for chronic conditions

---

## Payment History

View your own financial transactions — consultation fees, procedure charges, follow-up payments.

### Filtering

Date range, service type, payment mode, payment status.

### Summary Panel

Totals broken down by payment mode.

### Privacy Control

At **Profile → Payment Visibility** — toggle who can see your financial data. Can restrict to admin-only access.

---

## No-Show Tracking

See patients who missed your appointments without notice.

### Viewing

Paginated list sorted by most recent. Search by patient name/phone, filter by date range.

### Logging a No-Show

Open appointment → **Mark as No-Show** → optionally add reason/note → record moves to No-Show module automatically.

---

## Profile & Settings

| Section | What You Configure |
|---------|-------------------|
| **Profile → Edit** | Name, email, mobile, specialization, qualifications, registration number, image |
| **Profile → Services** | Your consultation types, duration, and fees |
| **Profile → Availability** | Working schedule — start/end times, slot duration, gap between appointments, max patients/day, unavailable days |
| **Profile → Prescription Templates** | Create/edit reusable prescription templates |
| **Profile → Prescription Preference** | Digital or manual mode |
| **Profile → Medicines** | Your medicine library and favorites |
| **Profile → Security** | Password change, active sessions |

---

## Working Habits

### Before Clinic Hours

- Review full day's schedule on dashboard
- Check patient queue at start of each session
- Set availability for next working day before logging off

### During Consultations

- Open patient's full history before they walk in
- Check allergies and current medications before prescribing
- Document findings immediately while details are fresh
- Use templates for common diagnoses
- Order all required tests in a single session

### End of Day

- Review any pending lab results from previous day
- Complete any outstanding documentation
- Flag critical lab results for priority callback within 24 hours

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Consultation won't start** | Verify appointment is "Scheduled" and patient is checked in. Refresh page. |
| **Prescription not saving** | Check all required fields (Strength, Frequency, Duration). Verify internet connection. |
| **Lab reports not visible** | Confirm test marked Completed by lab. Refresh patient record. Check correct patient profile. |
| **Patient record not loading** | Check internet. Try searching from Patients module. Clear browser cache. |

---

## Getting Help

- **Clinic Admin** — For scheduling, access, configuration issues
- **?** icon — Context-sensitive guidance on any screen
- **Profile → Contact Support** — Submit report with screenshots
- **support@infinitymedisetu.com** — Technical issues or feature requests
