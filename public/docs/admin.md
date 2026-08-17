# Administrator Guide

As an administrator, you have full control over your clinic's operations — staff accounts, appointments, patients, reports, subscription, and configuration. This guide walks you through each section of the admin workspace.

---

## Dashboard

Your landing page after login. It gives a quick read on clinic performance.

### Key Metrics (Top Cards)

| Metric | What It Shows |
|--------|---------------|
| **Total Earnings** | Revenue with period-over-period comparison |
| **Total Appointments** | Booking count with trend indicator |
| **No-Show Count** | Patients who missed appointments |
| **Active Patients** | Patients with recent activity |

### Visualizations

- **Appointment Status Breakdown** — Completed, confirmed, pending, cancelled, no-show counts
- **Revenue Overview** — Time-series chart with daily/weekly revenue and appointment overlay
- **Patient Growth** — New registrations over time
- **No-Show Trends** — Spot seasonal patterns or sudden spikes
- **Symptom Statistics** — Top reported symptoms across consultations

### Live Panels

- **Patient Queue** — Everyone currently checked in and waiting (real-time)
- **Recent Patients** — Quick-access list of latest interactions

---

## Appointments

Manage the clinic's full schedule from a list view or calendar view with color-coded status blocks.

### Filtering

Filter by date range, status (Scheduled / Confirmed / Completed / Cancelled / No-Show), doctor, or search by patient name, phone, or appointment ID.

### Booking a New Appointment

1. Click **New Appointment** (or press **A** on keyboard)
2. Search for the patient (autocomplete from existing records)
3. Select doctor → date → available time slot
4. Set appointment type, fee, and payment mode
5. Add notes (optional) → Confirm

> Tip: Available slots appear in green. Grey means already booked. Token-based doctors use first-come-first-served numbering instead of fixed time slots.

### Appointment Detail View

When you open an appointment, you see:

- Patient info and appointment details
- Assigned doctor
- Complete activity history (audit trail with timestamps)
- Prescription, lab reports, patient gallery
- Consent documents, medical certificate, additional services

### Available Actions

| Action | Description |
|--------|-------------|
| **Reschedule** | Pick new date/time — original slot released immediately |
| **Cancel** | Mandatory reason saved to audit trail |
| **Mark No-Show** | Patient didn't arrive — record moves to No-Show module |
| **Upload Consent** | Attach signed consent documents (PDF/image) |
| **Add Services** | Bill additional procedures to same appointment |

---

## Patient Management

Central repository of every patient who has interacted with the clinic.

### Finding Patients

Use global search — accepts name, phone, email, or patient ID.

### Registering a New Patient

1. Click **Add New Patient**
2. Required fields: Full name, mobile number
3. Optional: Email, gender, DOB, address, alternate mobile, emergency contact, insurance

### Patient Profile Contents

| Section | Details |
|---------|---------|
| **Personal Details** | Contact info, demographics |
| **Medical History** | Past illnesses, surgeries, chronic conditions, family history |
| **Allergies** | With severity levels |
| **Medications** | Current medications with dosage |
| **Consultations** | Every past visit with full details |
| **Prescriptions** | Every prescription ever generated |
| **Lab Reports** | With reference ranges |
| **Gallery** | Clinical images from all visits |
| **Billing** | Complete payment history |
| **No-Show Records** | Missed appointment history |

### Timeline View

All interactions displayed chronologically. Click any entry to expand full vitals, clinical notes, prescriptions, and lab orders from that visit.

---

## No-Show Management

Tracks patients who booked but didn't arrive — separate from cancellations because they represent held slots that went unused.

### No-Show List

Paginated view sorted by most recent. Each record shows patient name, original date/time, doctor, and when logged.

### Viewing Patterns

Click any record to see:
- Total missed appointments for that patient
- Dates of each occurrence
- System-identified patterns

> Tip: Patients with 3+ no-shows in a short window are worth following up — they may have a transportation or communication issue.

### No-Show Policy

Configure at **Profile → No-Show Policy**:
- Enable/disable automatic tracking
- Set max allowed no-shows before flagging
- Define follow-up actions for repeat offenders

---

## Payment History

Complete financial log of every clinic transaction.

### Transaction Record Fields

Patient name/mobile, doctor name/specialization, service name, date, amount, entry type (Credit/Debit), payment mode (Cash/Card/UPI/Insurance), refund info, transaction ID.

### Filtering

Combine filters: date range, doctor, patient, payment mode, status (Paid/Refunded), entry type.

### Summary Panel

Shows aggregated totals with payment mode breakdown for the filtered period.

### Export

Export filtered data for accounting reconciliation (monthly recommended).

---

## User Management

Create, edit, deactivate, and delete staff accounts.

### Adding a User

1. Click **Add User**
2. Enter name, email (becomes login), mobile, role
3. For doctors: also set specialization and qualifications
4. Save → credentials emailed automatically

### Account Actions

| Action | When to Use |
|--------|-------------|
| **Edit** | Update name, contact, specialization, role |
| **Deactivate** | Suspend access temporarily (data preserved, can reactivate) |
| **Delete** | Permanent removal — use only when certain (orphans historical data) |
| **Reset Password** | Send fresh password link to locked-out user |

### Specialized Management

- **Doctors** — Set specialization, fees, weekly schedule, slot durations, performance metrics
- **Lab** — Manage lab entities and lab assistant accounts
- **Pharmacy** — Manage pharmacy details and pharmacist accounts

> Warning: Deactivate rather than delete departing staff. Deactivation preserves consultation history; deletion orphans it.

---

## Test Catalog

The list of laboratory tests your clinic offers. Doctors order from this catalog, and lab assistants process against these configurations.

### Adding a Test

Enter: test name, unique code, category (Hematology, Biochemistry, Microbiology, etc.), sample type, price, turn-around time, reference ranges, special instructions.

### Managing Tests

- Edit pricing, reference ranges, and instructions anytime
- Use **Enable/Disable** to retire a test without losing historical data
- **CSV Import** for bulk setup or updates

> Important: Reference ranges determine which results are flagged abnormal. Get these right — the entire alert system depends on them.

---

## Clinic Configuration

All settings are under **Profile** in the sidebar.

| Section | What You Configure |
|---------|-------------------|
| **Profile → Clinic** | Name, address, registration number, contact, hours, working days, logo |
| **Profile → Services** | Service types, duration, and fees (General Consultation, Follow-up, Procedure, etc.) |
| **Profile → Notification Settings** | Which roles receive which notification types |
| **Profile → Payment Visibility** | Who can see financial data |
| **Profile → No-Show Policy** | Auto-tracking rules and threshold actions |
| **Profile → Subscription** | Current plan, feature usage, billing history, upgrade |
| **Profile → Security** | Password change, active sessions, MFA |
| **Profile → Referral** | Unique referral link, referral status, rewards |

### Departments

Organize your clinic by departments (General Physician, Cardiology, Dermatology, etc.):
- Patients can filter by department when booking
- Reports can be generated per-department
- Doctors are assigned to one or more departments

### Banners & Announcements

Display announcements to patients through the app:
1. Go to **Settings → Banners**
2. Add banner content, image (optional), and display period
3. Use for: holiday closures, new services, health campaigns, clinic updates

---

## Reports & Analytics

Turn clinic data into actionable insights. All reports support date filtering and PDF/Excel export.

### Report Categories

| Category | Includes |
|----------|----------|
| **Appointments** | Status breakdown, doctor distribution, slot utilization, trend comparisons |
| **Revenue** | Payment mode breakdown, doctor contribution, service distribution, trends |
| **Patients** | Registrations over time, demographics, visit frequency, retention |
| **Doctor Performance** | Consultation count, completion rate, avg duration, feedback scores, no-show rate |
| **No-Show Analytics** | Trends, per-doctor breakdown, repeat offenders, day-of-week patterns |

### Generating a Report

1. Select report type
2. Set date range
3. Apply filters (doctor, status, payment mode)
4. Click **Generate**
5. View on-screen or export as PDF/Excel

---

## Operational Best Practices

### Daily

- Review dashboard metrics for anomalies
- Check today's schedule for completeness
- Monitor patient queue for delays
- Review pharmacy low-stock alerts
- Check notifications for errors or pending approvals

### Weekly

- Generate appointment and revenue reports
- Review no-show analytics and follow up
- Audit user activity logs
- Update test catalog pricing if needed
- Review doctor performance metrics

### Monthly

- Financial reconciliation (system vs bank statements)
- Staff performance review
- Verify backups and data retention
- Review clinic policies (no-show, cancellation)
- Check subscription usage vs limits
- Update operating hours for holidays

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Can't create appointment** | Verify doctor availability for that date/time. Register the patient first if they don't exist. |
| **User can't log in** | Check account is active, email matches exactly, try Reset Password |
| **Reports show no data** | Expand date range, verify data exists for filters, remove all filters first |
| **Feature appears locked** | Check subscription plan at Profile → Subscription |
| **Real-time updates stopped** | Refresh page to reconnect WebSocket |

---

## Getting Help

- **?** icon on any screen for context-sensitive guidance
- **Profile → Contact Support** for detailed issues with screenshots
- **support@infinitymedisetu.com** for technical issues
- **1800-XXX-XXXX** for urgent issues during business hours
