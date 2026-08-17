---
title: Stock Management
description: Batch & expiry tracking
product: pharmacy
category: Feature Guides
order: 4
icon: 📊
---

# Stock Management

![Stock — batches, expiry and adjustments](/docs/images/pharmacy/pharmacy-stock.svg)


**Stock Management** deals with batch-wise tracking, physical stock counts, expiry audits, and inventory adjustments.

## Batch-wise Control

Medicines must be tracked by their manufacturing batch. Multiple batches of the same medicine can coexist. The system tracks:

- **Batch Number**: Unique identifier from the manufacturer.
- **Manufacturing & Expiry Dates**: System auto-alerts when expiry is within 90 days.
- **Cost Price (CP) & Maximum Retail Price (MRP)**: Keeps track of financial margins per batch.

## Stock Adjustments & Audits

If physical inventory does not match system values, execute a **Stock Adjustment**:

1. Open the Medicine detail page and click **Adjust Stock**.
2. Input the adjustment quantity (use negative integers to deduct, positive to add).
3. Select an audit reason:
   - **Damage/Breakage**
   - **Expired Stock Disposal**
   - **Physical Count Reconciliation**
   - **Supplier Return**
4. Add reference notes explaining the change.

> [!IMPORTANT]
> Every stock adjustment creates an immutable audit log. Ensure accurate explanations to maintain clean financial and legal records.
