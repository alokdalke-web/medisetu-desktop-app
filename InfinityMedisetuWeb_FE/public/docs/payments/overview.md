# Payments History — Quick Reference

Complete financial log of every transaction the clinic has processed.

---

## Transaction Fields

| Field | Description |
|-------|-------------|
| Patient | Name and mobile |
| Doctor | Name and specialization |
| Service | What was provided |
| Date | When it occurred |
| Amount | Transaction value |
| Entry Type | Credit or Debit |
| Payment Mode | Cash, Card, UPI, Insurance |
| Status | Paid or Refunded |
| Transaction ID | For bank reconciliation |

---

## Filtering

Combine multiple filters to answer specific questions:

| Filter | Example Use |
|--------|-------------|
| Date range | "All transactions in March" |
| Doctor | "Dr. Sharma's revenue" |
| Patient | "Patient X's billing history" |
| Payment mode | "All UPI payments" |
| Status | "All refunds this quarter" |
| Entry type | "Credits only" |

---

## Summary Panel

Shows aggregated totals for the filtered period with breakdown by payment mode:
- Cash total
- Card total
- UPI total
- Insurance total

---

## Monthly Reconciliation Process

1. Set date range to last month
2. Remove all other filters
3. Compare system total against bank statement
4. If discrepancy: filter by payment mode to isolate where the gap is
5. Export the data for accounting records

---

## Subscribed Patients View

Dedicated view for patients on subscription plans:
- Patient details and plan name
- Validity period and expiry date
- Payment status and mode
- Amount paid

Filter by plan, status, or date range.

---

## Tips

- Export monthly for accounting reconciliation
- Filter by mode to reconcile cash drawer vs system
- Refund tracking: filter by "Refunded" status
- UPI/Card: match transaction IDs against payment gateway
