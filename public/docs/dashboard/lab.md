---
title: Lab Dashboard
description: Tests & sample tracking
product: dashboard
category: Feature Guides
order: 5
icon: 🔬
---
# Lab Dashboard

![Lab dashboard — test workload and pending reports](/docs/images/dashboards/dashboard-lab.svg)


Your workload summary — what needs to be done, what's in progress, and what's complete.

---

## Panels

### Top Cards

| Card | What It Shows | Your Action |
|------|---------------|-------------|
| **Total Tests** | All tests in the selected period | Gauge overall workload |
| **In Progress** | Samples collected, processing started | Monitor for completion |
| **Completed** | Tests finished and results submitted | Verify for accuracy |
| **Samples Collected** | Samples collected in the period | Track collection throughput |
| **Pending Reports** | Completed tests still needing a report uploaded | Upload reports promptly |
| **Sample Rejection Rate** | % of samples rejected | Keep low — investigate spikes |

### Panels

| Panel | What It Shows |
|-------|---------------|
| **Revenue Overview** | Test revenue over time |
| **Top Performing Tests** | Highest-volume / highest-revenue tests |
| **Recent Test Requests** | Latest orders for quick reference |
| **Pending Reports** | Tests awaiting report upload |
| **Quick Actions** | Shortcuts to test queue, walk-in test, and more |

---

## Priority Handling

STAT and urgent tests appear with distinct flags. Always:
1. Process STAT tests ahead of all routine work
2. Collect samples within 15 minutes if patient is present
3. Fast-track through every stage — no batching with routine
4. Notify the ordering doctor immediately on completion

---

## Start of Shift Routine

1. Check **Pending Tests** — these are your immediate action items
2. Review **Priority Indicators** — STAT tests go first
3. Run instrument startup checks and QC samples
4. Check refrigerator/freezer temperatures
5. Verify reagent stock levels

---

## During the Day

- Process tests in priority order (STAT > Urgent > Routine)
- Update status as you progress (Sample Collected → In Progress → Completed)
- Enter results immediately after each test completes
- Flag critical values and notify the doctor within 5 minutes

---

## End of Shift

- Verify all completed tests have results submitted
- Check for any pending tests that may have been missed
- Log instrument status and any issues encountered
- Clean and decontaminate work surfaces
