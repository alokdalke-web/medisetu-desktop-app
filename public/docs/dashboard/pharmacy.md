---
title: Pharmacy Dashboard
description: Sales & inventory health
product: dashboard
category: Feature Guides
order: 6
icon: 💊
---
# Pharmacy Dashboard

![Pharmacy dashboard — sales cards and stock health](/docs/images/dashboards/dashboard-pharmacy.svg)


Your operations summary — sales performance, stock health, and pending work.

---

## Panels

### Top Cards

| Card | What It Shows | Your Action |
|------|---------------|-------------|
| **Total Sales (Today)** | Total revenue from pharmacy sales today | Track daily performance |
| **Today's Profit** | Profit on today's sales | Watch margins |
| **Low Stock Medicines** | Medicines below minimum threshold | Initiate reorders now |
| **Amount Paid To Suppliers** | Payments made to suppliers | Reconcile purchasing |

### Panels

| Panel | What It Shows |
|-------|---------------|
| **Category Revenue** | Revenue split by medicine category |
| **Top Performers** | Highest-volume / highest-revenue medicines |
| **Payment Overview** | Sales by payment mode |
| **AI Stock Prediction** | Forecasted stock needs and reorder guidance |
| **Smart Insights** | Automated observations about sales and inventory |
| **Quick Actions** | Shortcuts to prescriptions, new sale, stock, etc. |

---

## Stock Health Indicators

| Status | Meaning | Action |
|--------|---------|--------|
| 🟢 Healthy | Above minimum threshold | No action needed |
| 🟡 Low | Below minimum, not zero | Reorder from supplier |
| 🔴 Critical | Very low, likely to run out | Urgent reorder |
| ⚫ Out of Stock | Zero quantity | Cannot dispense — inform patients |
| ⚠️ Expiring | Within 90 days of expiry | Dispense first (FEFO) |
| ❌ Expired | Past expiry date | Remove from shelves immediately |

---

## Start of Shift Routine

1. Open **Prescriptions** — process pending scripts in order of arrival
2. Review the **Low Stock Medicines** card — initiate reorders before running out
3. Verify refrigerator temperatures for cold-chain medicines
4. Check **Expiring Soon** — remove newly expired stock from shelves

---

## During the Day

- Process prescriptions in order (STAT prescriptions first)
- Always dispense FEFO (First Expiry, First Out)
- Generate invoices immediately upon dispensing
- Counsel patients on dosage, timing, storage

---

## End of Shift

- Reconcile cash drawer with system sales
- Secure controlled substances
- Verify controlled substance counts
- Check if any new low-stock alerts appeared during the day
