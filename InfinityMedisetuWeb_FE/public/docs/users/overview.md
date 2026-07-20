# User Management — Quick Reference

Create, edit, deactivate, and delete the staff accounts that make up your clinic.

---

## Roles & Access

| Role | Access Level |
|------|-------------|
| **Admin** | Full access to their clinic |
| **Doctor** | Appointments, consultations, prescriptions, lab orders |
| **Receptionist** | Patient registration, appointments, billing, queue |
| **Lab Assistant** | Test queue, sample tracking, results |
| **Pharmacist** | Inventory, dispensing, invoices, suppliers |

---

## Adding a User

1. Click **Add User**
2. Enter name, email (becomes login), mobile
3. Select role
4. For doctors: set specialization and qualifications
5. Save → credentials emailed automatically

---

## Account Actions

| Action | When to Use | Reversible? |
|--------|-------------|-------------|
| **Edit** | Update details, contact, role | Yes |
| **Deactivate** | Suspend access temporarily | Yes (reactivate) |
| **Delete** | Permanent removal | ❌ No |
| **Reset Password** | User locked out | Yes |

> Warning: Always deactivate departing staff rather than deleting. Deletion orphans their historical data permanently.

---

## Doctor Configuration

| Setting | Where | Impact |
|---------|-------|--------|
| Specialization | Doctor profile | Shown to patients during booking |
| Consultation fees | Doctor profile | Applied to new appointments |
| Weekly schedule | Availability settings | Determines bookable slots |
| Slot duration | Availability settings | Controls appointment length |
| Max patients/day | Availability settings | Limits overbooking |

---

## Subscription Limits

Your plan defines maximum accounts:

| What to Check | Where |
|---------------|-------|
| Current doctor usage | Subscription → Limits Overview |
| Current staff usage | Subscription → Limits Overview |
| Purchase more slots | Subscription → Add-Ons |

If you see "Limit Reached" → purchase an add-on or upgrade plan.

---

## Multi-Factor Authentication

If MFA is enabled for your clinic:
- All staff set up TOTP on first login
- Adds a code step after password
- Admin can view MFA status for all users
- Users can reset from their profile

---

## Tips

- Use email addresses people actually check (becomes their login)
- Set doctor availability before enabling patient bookings
- Review access after role changes
- Deactivate accounts for departed staff immediately
- Quarterly: audit active user list for accuracy
