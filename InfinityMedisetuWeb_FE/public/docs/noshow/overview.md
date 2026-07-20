# No-Show Management — Quick Reference

Track patients who booked but didn't arrive. Separate from cancellations because they represent held slots that went unused.

---

## Why Track No-Shows?

- Held slots that could have served other patients
- Identify patients who need different communication
- Spot scheduling or reminder system issues
- Data for policy decisions (deposits, restrictions)

---

## No-Show List

Paginated view sorted by most recent. Each record shows:
- Patient name and contact
- Original appointment date/time
- Assigned doctor
- When the no-show was logged

---

## Viewing Patterns

Click any patient to see:
- Total missed appointments
- Dates and times of each occurrence
- System-identified patterns (day-of-week, specific doctor, etc.)

---

## No-Show Policy

Configure at **Profile → No-Show Policy**:

| Setting | Description |
|---------|-------------|
| Auto-tracking | Enable/disable automatic no-show logging |
| Max threshold | No-shows allowed before flagging |
| Follow-up actions | What happens for repeat offenders |

---

## Response Framework

| Occurrence | Recommended Action |
|------------|-------------------|
| **1st no-show** | Likely genuine — attempt rebook |
| **2nd occurrence** | Add to enhanced reminder list |
| **3rd or more** | Flag for admin review, consider policy action |

---

## Analytics Available

| Metric | What It Reveals |
|--------|----------------|
| Total no-shows in period | Overall clinic problem scale |
| Per-doctor breakdown | Scheduling or communication issues |
| Day-of-week patterns | Systematic day problem (e.g., Wednesdays) |
| Repeat offender list | Patients needing intervention |

---

## Follow-Up Best Practices

- Contact same day — most are genuine emergencies
- Don't blame — goal is to rebook
- Document all outreach attempts
- If unreachable after 2 attempts, note in record
- Flag 3+ offenders for admin/doctor review

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No-show not logged | Must be marked manually from appointment detail |
| Wrong patient flagged | Check if appointment was actually cancelled (different status) |
| Policy not applying | Verify it's enabled at Profile → No-Show Policy |
