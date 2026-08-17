---
title: Dashboard
description: Overview & common features
product: dashboard
category: Feature Guides
order: 1
icon: 📊
---
# Dashboard Guide

![Dashboards — role-based views at a glance](/docs/images/dashboards/dashboard-overview.svg)


The Dashboard is your first screen after login. It provides a real-time snapshot of your clinic's operations, tailored to your role. Each user type sees different metrics and panels relevant to their responsibilities.

---

## Admin Dashboard

The admin dashboard gives a complete operational overview of the clinic.

### Key Metrics

| Metric | What It Shows | Action If Declining |
|--------|---------------|---------------------|
| **Total Revenue** | Revenue with % vs previous period | Check avg revenue per visit |
| **Total Appointments** | Booking count with trend | Review marketing or reminders |
| **Total Patients** | Patients registered | Check retention efforts |
| **No Shows** | Missed appointments | Review reminder settings |
| **Pending Payments** | Outstanding amounts not yet collected | Follow up on collections |

### Charts & Panels

| Chart / Panel | What to Look For |
|-------|-----------------|
| **Revenue Overview** | Revenue down + appointments steady = lower avg revenue |
| **Appointment Status** | High cancellation rate = scheduling issue |
| **Top Symptoms** | Clusters = local outbreak or seasonal trend |
| **Patient Overview** | Registrations and recent patient interactions |

---

## Doctor Dashboard

Focused on your personal clinical performance and today's patient flow.

### Key Metrics

| Metric | What It Shows |
|--------|---------------|
| **Today's Appointments** | Your bookings scheduled for today |
| **Waiting Patients** | Patients checked in and waiting to be seen |
| **Completed** | Consultations you've finished today |
| **Remaining** | Appointments still left to see today |

### Panels

- **Queue Summary** — Checked-in patients waiting for you (live "Waiting Now")
- **Recent Patients** — Quick access to latest consultations

### Call Reception

Use the **Call Reception** button in the header:
- **General Call** — Need front-desk assistance
- **Next Patient** — Ready to see the next patient in queue

---

## Receptionist Dashboard

Built for front-desk situational awareness — what's happening right now.

### Key Panels

| Card / Panel | Purpose |
|-------|---------|
| **Today's Appointments** | Live count of visits scheduled today |
| **Pending Check-ins** | Patients with appointments but not yet arrived |
| **Confirmed** | Appointments confirmed for today |
| **Completed** | Consultations finished today |
| **Today's Appointments (list)** | Check in, reschedule, cancel, or mark no-show |
| **Quick Actions** | One-click shortcuts (new appointment, walk-in) |

---

## Lab Dashboard

Summarizes your lab's workload and priorities.

### Panels

| Card / Panel | What It Shows |
|-------|---------------|
| **Total Tests** | All tests in the selected period |
| **In Progress** | Samples collected, processing started |
| **Completed** | Tests finished and results submitted |
| **Samples Collected** | Samples collected in the period |
| **Pending Reports** | Completed tests still needing a report uploaded |
| **Sample Rejection Rate** | Percentage of samples rejected |
| **Revenue Overview / Top Performing Tests / Recent Test Requests / Quick Actions** | Supporting charts and shortcuts |

---

## Pharmacist Dashboard

Summarizes pharmacy operations at a glance.

### Panels

| Card / Panel | What It Shows |
|-------|---------------|
| **Total Sales (Today)** | Total revenue from pharmacy sales today |
| **Today's Profit** | Profit on today's sales |
| **Low Stock Medicines** | Medicines below minimum threshold |
| **Amount Paid To Suppliers** | Payments made to suppliers |
| **Category Revenue / Top Performers / Payment Overview** | Sales breakdowns |
| **AI Stock Prediction / Smart Insights / Quick Actions** | Forecasts, insights, and shortcuts |

---

## Date Filters

All dashboards support date filtering:

| Tab | What It Shows |
|-----|---------------|
| **Today** | Current day's performance |
| **This Week** | Rolling 7-day view |
| **This Month** | Month-to-date vs last month |
| **Custom** | Pick any date range |

> Tip: Period comparison is automatic. "This Month" compares against last month.

---

## Daily Review Checklist

- [ ] Check key metrics for anomalies
- [ ] Monitor patient queue for growing delays
- [ ] Review no-show count — rising trend needs action
- [ ] Check notifications for errors or pending approvals
- [ ] Review low-stock/expiry alerts (pharmacy)
