# Appointments — Quick Reference

This is a focused guide for the appointment module. For the full role-based guides, see the [Admin Guide](../admin.md) or [Doctor Guide](../doctor.md).

---

## Appointment Status Flow

```
Booked → Patient Arrived → Confirmed → Completed
              ↓
       Cancelled / No-Show / Rescheduled
```

| Status | Meaning |
|--------|---------|
| **Pending** | Appointment created, awaiting patient arrival |
| **Patient Arrived** | Receptionist has checked the patient in |
| **Confirmed** | Doctor has started/accepted the consultation |
| **Completed** | Consultation finished, prescription saved |
| **Cancelled** | Appointment cancelled (reason required) |
| **No-Show** | Patient didn't arrive, slot time passed |
| **Rescheduled** | Moved to a different date/time |

---

## Views

| View | Best For |
|------|----------|
| **List** | Searching, filtering, bulk actions, exporting |
| **Card** | Quick visual scan of patient info |
| **Calendar** | Seeing the day/week at a glance, spotting gaps |

---

## Keyboard Shortcuts

| Key | Action | Where |
|-----|--------|-------|
| **A** | Open new appointment form | Appointment list page |
| **C** | Confirm appointment | Appointment detail page |
| **Esc** | Close active modal | Anywhere |

---

## Filtering Options

- **Date range** — Navigate day-by-day or pick a custom range
- **Status** — All, Pending, Confirmed, Completed, Cancelled, No-Show
- **Search** — Patient name, phone number, or appointment ID
- **Doctor** — Filter by specific doctor (admin/reception only)

---

## Real-Time Queue

When viewing today's appointments:

- **Queue Delay Banner** — Shows cumulative delay if the doctor is running behind
- **Time to Next Widget** — Minutes until the next patient
- **Estimated Wait** — Per-appointment estimated wait time (visible in list view)

> These update automatically via WebSocket — no refresh needed.

---

## Booking an Appointment

### Steps

1. Click **+ New Appointment** (or press **A**)
2. Search for existing patient by name or phone
3. Select doctor
4. Pick available date and time slot (green = available, grey = booked)
5. Set service type and fee
6. Choose payment mode
7. Add symptoms/notes (optional)
8. Confirm booking

### Token vs Time-Slot

| Mode | How It Works |
|------|-------------|
| **Time-slot** | Fixed appointment time (e.g., 10:30 AM) |
| **Token** | Numbered queue position (first-come-first-served) |

The mode depends on how the doctor's schedule is configured by the admin.

### Walk-In Patients

1. Select today's date
2. Check which doctors have open slots
3. Book the next available slot
4. Check patient in immediately

---

## Appointment Detail Page

### What You See

- **Summary Card** — Patient info, doctor, date/time, status, payment
- **Services Card** — Primary service + any additional procedures billed
- **Vitals Section** — BP, temperature, weight, height, SpO2 (receptionist fills pre-consultation)
- **Tabs** — History, Prescription, Lab Reports, Gallery, Consent, Medical Certificate

### Actions Available

| Action | Who Can Do It | When |
|--------|---------------|------|
| **Confirm** | Doctor, Admin | When status is Pending or Patient Arrived |
| **Patient Arrived** | Receptionist | When status is Pending |
| **Mark Completed** | Doctor, Admin | When status is Confirmed |
| **Reschedule** | All staff | Before confirmation (not for token appointments) |
| **Cancel** | All staff | Before confirmation |
| **Mark No-Show** | All staff | When patient didn't arrive |
| **Add Services** | Doctor, Admin | When confirmed or completed |
| **Generate Invoice** | All staff | When payment mode is set |
| **Consent Form** | Doctor | When confirmed or completed |
| **Medical Certificate** | Doctor | When completed |
| **Refer Form** | Doctor | When confirmed or completed |

### Pay Later Flow

If payment mode is "Pay on Visit":
1. Patient arrives → Receptionist checks in
2. "Mark as Paid" banner appears at the top
3. Click to select actual payment mode (Cash/Card/UPI)
4. Once paid, doctor can confirm and start consultation

### Consent Form Flow

1. Open appointment detail (must be Confirmed or Completed status)
2. Click **Consent Form** or **Upload Consent**
3. Option A: Type consent notes → Print form for patient signature
4. Option B: Upload pre-signed consent document (PDF/image)
5. Consent permanently linked to appointment record

### Medical Certificate

1. Appointment must be in Completed status
2. Click **Medical Certificate**
3. Enter medical condition, rest days, and additional notes
4. Generate → linked permanently to appointment
5. Print or download as needed

### Refer Form

1. Click **Refer Form** from appointment detail
2. Enter referred doctor/clinic name, address, phone
3. Add referral notes
4. Save and print for patient

---

## No-Show Management

- Mark no-show from appointment detail → **Mark as No-Show**
- Record moves to the No-Show module automatically
- Patient's no-show history is visible in their profile
- Follow up with repeat offenders (3+ no-shows)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Can't create appointment | Check doctor availability for that date. Register patient first if they don't exist. |
| Slot appears unavailable | Refresh page — may have just been booked. Try adjacent time. |
| Consultation won't start | Verify appointment is Pending/Patient Arrived and patient is checked in. |
| Prescription locked | Confirm the appointment first (click Confirm button). |
| Real-time queue not showing | Only appears when viewing today's date. Check WebSocket connection (refresh page). |
