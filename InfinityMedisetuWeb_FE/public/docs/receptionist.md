# Receptionist Guide

You are the first point of contact for every patient. Your workspace is designed for front-desk operations — scheduling appointments, registering patients, checking arrivals in, handling walk-ins, and managing the patient queue.

---

## Dashboard

Built for situational awareness — what's happening right now and what needs attention.

### Key Panels

| Panel | What It Shows |
|-------|---------------|
| **Today's Appointments** | Live count of all scheduled visits (updates in real-time) |
| **Pending Check-ins** | Patients with appointments today but not yet marked arrived |
| **Walk-in Queue** | Patients without appointments currently waiting |
| **Upcoming Slots** | Next available booking slots across all doctors |
| **Recent Bookings** | Last few appointments created or modified |
| **Doctor Availability** | Which doctors are working and their next open slots |

### Quick Actions

One-click shortcuts to **Create New Appointment** or **Register Walk-in** without navigating through menus.

---

## Managing Appointments

View the clinic's schedule as a **list view** (paginated, sorted by time) or **calendar view** (color-coded blocks by status).

### Filtering

- **By date** — Jump to any day or range
- **By doctor** — Narrow to one doctor's schedule
- **By status** — Scheduled, Checked In, In Progress, Completed, Cancelled, No-Show
- **By search** — Patient name, phone, or appointment ID

### Booking a New Appointment

1. Search for patient by name or phone (autocomplete)
2. Select doctor → date → available time slot
3. Set appointment type and fee
4. Add notes (optional)
5. Confirm — appears in doctor's queue immediately

> Note: The system prevents double-booking. If you see a slot available, it's genuinely open.

### Walk-In Patients

1. Check current availability for preferred doctor
2. If no immediate slot, check other doctors or offer next opening
3. Mark appointment type as "Walk-in"
4. Tell patient expected wait time
5. Check them in immediately if doctor is available

### Checking In a Patient

When a patient arrives:

1. Find their appointment in today's list
2. Verify identity (name + phone or DOB)
3. Click **Check In**
4. Doctor's queue updates instantly

> Important: Check patients in promptly. Even a few minutes delay propagates through the doctor's entire day.

### Rescheduling

1. Open the appointment → **Reschedule**
2. Select new date and available slot
3. Confirm — original slot released immediately
4. Patient is notified

### Cancellation

1. Open appointment → **Cancel**
2. Enter mandatory cancellation reason (saved to history)
3. Slot becomes available immediately

> Tip: Always offer to rebook when cancelling. A cancelled appointment without a rebook is often a lost patient.

### Adding Notes

Add appointment notes with information for the doctor — patient requests, documents brought, pre-visit observations. Visible in appointment detail.

---

## Patient Registration

### The Golden Rule: Always Search First

Before creating a new record, **search by phone number** (most reliable) or name. Duplicate records cause serious downstream problems — split medical history, confused billing, incomplete records.

### Registering a New Patient

1. Click **New Patient**
2. Required: Full name + mobile number
3. Optional: Email, gender, DOB, address, alternate mobile, emergency contact
4. Save

### Quick Registration (Walk-ins)

For patients who need to be seen quickly — register with just name and phone. Add remaining details later.

### Can't Find a Patient?

Try these before creating a new record:
- Search by phone number
- Search by first name only
- Check if registered under a family member's phone
- Try alternate name spellings

---

## No-Show Management

A no-show = patient had a confirmed appointment, slot time passed, they never arrived or communicated.

### Logging a No-Show

1. Go to Appointments
2. Find the appointment (patient didn't arrive, slot time passed)
3. Open detail → **Mark as No-Show**
4. Status updates, record moves to No-Show module

### Follow-Up Process

After logging a no-show:

1. Contact the patient to understand why
2. Offer to rebook
3. If unreachable after 2 attempts, document the outreach
4. Flag patients with 3+ no-shows for admin/doctor review

### Pattern Recognition

| Occurrence | Response |
|------------|----------|
| First no-show | Likely genuine emergency — attempt rebook |
| Second occurrence | Enroll in additional reminders |
| Third or more | Flag for policy action (deposit, admin review) |

---

## Handling Doctor Calls

Doctors send real-time alerts via the **Call** button in their header.

| Call Type | Your Response |
|-----------|---------------|
| **General Call** | Doctor needs front-desk assistance — respond and acknowledge |
| **Next Patient** | Doctor is ready — direct next checked-in patient to consultation room. If queue empty, inform them. |

---

## Managing Doctor Availability

### Start of Shift

- Verify which doctors are working today
- Confirm their scheduled hours
- Cross-check day's bookings against doctor availability

### When Availability Changes Unexpectedly

If a doctor calls in sick, is running late, or needs to leave early:

1. Contact all their remaining scheduled patients immediately
2. Offer reschedule or transfer to another available doctor
3. The earlier you reach patients, the less disruption

> Note: Doctor schedules are configured by admins. If the system schedule needs updating, inform the administrator.

---

## Billing & Payments

### Processing a Payment

After consultation is complete:

1. Go to the patient's visit
2. Click **Generate Bill**
3. Add charges: consultation fee + procedures + medicines (if applicable)
4. Select payment mode
5. Process payment → Generate receipt

### Payment Modes

| Mode | How to Process |
|------|----------------|
| **Cash** | Enter amount received, system calculates change |
| **UPI** | Generate QR or accept payment confirmation |
| **Card** | Process through POS terminal, enter reference number |
| **Insurance** | Verify coverage, process claim |

### Payment History

Go to **Billing → History** — filter by date, patient, or payment mode. View and reprint past receipts.

> Warning: Always confirm payment receipt before marking as complete. Once marked paid, it appears in revenue reports and cannot be easily reversed.

---

## Queue Management

### Real-Time Queue

Shows:
- Patients waiting (checked in, not yet seen)
- Patient currently in consultation
- Estimated wait times

### Managing Disruptions

If a doctor is running late:
1. Communicate expected delay to waiting patients
2. Offer rescheduling for patients who can't wait
3. Update queue to reflect changes

> Tip: Proactive communication about delays reduces frustration significantly. A patient who knows they'll wait 30 minutes is calmer than one who doesn't know how long.

---

## Your Profile

| Section | What You Can Do |
|---------|-----------------|
| **Profile → Edit** | View/edit name, contact, role info |
| **Profile → Security** | Change password, view active sessions, terminate unrecognized sessions |
| **Profile → Contact Support** | Submit technical issues with details |
| **Clinic Details** | View clinic name, address, hours (read-only) |

---

## Daily Workflow Checklist

### Opening

- [ ] Open Appointments — review full day's schedule
- [ ] Cross-check doctor availability with today's bookings
- [ ] Contact patients of unavailable doctors immediately
- [ ] Follow up on yesterday's no-shows

### During the Day

- [ ] Check patients in promptly on arrival
- [ ] Handle walk-ins by checking current availability
- [ ] Process payments after consultations
- [ ] Handle reschedules and cancellations as they come
- [ ] Respond to doctor calls immediately

### Closing

- [ ] Review appointments still showing as "Scheduled" where patient never arrived
- [ ] Log no-shows (don't leave as Scheduled overnight)
- [ ] Verify payment records for the day

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Patient record not found** | Try phone number, first name only, family member's number, alternate spellings |
| **Slot showing unavailable** | Refresh page — may have just been booked by another user. Try adjacent slot. |
| **Can't check in patient** | Verify appointment is "Scheduled" (not Cancelled/No-Show). Refresh page. |
| **Doctor call notifications not appearing** | Refresh page to reconnect. Ensure browser notifications not blocked. |

---

## Getting Help

- **Clinic Admin** — For access issues, permissions, policy questions
- **?** icon — Context-sensitive guidance on any screen
- **Profile → Contact Support** — Submit report with screenshots
- **support@infinitymedisetu.com** — Technical issues
