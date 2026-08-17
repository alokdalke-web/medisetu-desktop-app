# Pharmacist Guide

You manage the pharmacy operation — receiving prescriptions from doctors, maintaining medicine inventory, processing sales, generating invoices, tracking suppliers, and monitoring stock health.

---

## Dashboard

Your landing page summarizes the pharmacy at a glance.

| Panel | What It Shows |
|-------|---------------|
| **Today's Sales** | Total revenue from pharmacy sales today |
| **Low Stock Alerts** | Medicines below minimum threshold — need restocking |
| **Pending Prescriptions** | Prescriptions awaiting dispensing — your action queue |
| **Expiring Soon** | Medicines within 90 days of expiry |
| **Top Selling Medicines** | Highest-volume items by sales |
| **Stock Health** | Visual breakdown — healthy, low, critical, expired |
| **Sales Trend** | Daily/weekly revenue chart |
| **Recent Transactions** | Latest invoices for quick reference |
| **Inventory History** | Recent stock movements (additions, deductions, adjustments) |

---

## Prescription Queue

Where all dispensing work begins. Every prescription from a doctor flows here.

### Each Entry Shows

- Patient name and contact
- Prescribing doctor and date
- List of medicines with dosages
- Status: Pending / In Progress / Dispensed

### Processing a Prescription

1. Open prescription → verify doctor credentials and patient identity
2. Check each medicine for stock availability and expiry
3. Prepare medicines following **FEFO** (First Expiry, First Out)
4. Generate invoice for dispensed items
5. Mark as **Dispensed**

### When Medicine is Out of Stock

- Check for generic alternatives or different brands with same composition
- Inform patient about substitution options and price differences
- Get patient consent before substituting
- Document the substitution on the invoice
- For controlled substances — contact prescribing doctor

### Partial Dispensing

If only some medicines available:
1. Dispense what you have
2. Generate partial invoice
3. Inform patient when remaining items will be available

---

## Medicines Module

Your complete inventory of every product in the pharmacy.

### Stock Status Indicators

| Status | Meaning |
|--------|---------|
| **In Stock** | Above minimum threshold |
| **Low Stock** | Below minimum, not zero |
| **Critical** | Very low, likely to run out soon |
| **Out of Stock** | Zero quantity |
| **Expiring** | Within 90 days of expiry |
| **Expired** | Past expiry — ineligible for dispensing |

### Finding Medicines

Search by brand name, generic/chemical composition, or manufacturer. Filter by category (Antibiotics, Analgesics, Antipyretics, Vitamins, Chronic Disease, OTC) or by stock status.

### Medicine Detail View

- Basic info: Name, generic, manufacturer, category
- Pricing: MRP, purchase price, margin
- Stock: Total across all batches + individual batch details (quantity, expiry, purchase date)
- Movement history: Every addition, deduction, adjustment with dates
- Supplier info

### Registering a New Medicine

Enter: brand name, generic composition, manufacturer, category, unit (tablet/capsule/bottle/strip), HSN code, rack/shelf location.

> Tip: Record the shelf location — it helps anyone find the medicine physically, even when regular staff isn't available.

---

## Stock Management

### Adding a New Batch

Enter: batch number, quantity, MRP/unit, purchase price/unit, expiry date, manufacturing date, supplier. Stock is available for dispensing immediately.

### Stock Adjustments

For discrepancies between physical and system count (damage, theft, errors, returns):

1. Open medicine → **Adjust Stock**
2. Enter quantity (positive to add, negative to reduce)
3. Select reason
4. Add explanatory notes
5. Save — logged permanently in stock history

> Important: Every adjustment is audited. The audit trail is your protection for regulatory compliance.

### Minimum Thresholds

Set per medicine. When quantity drops below threshold → low-stock alert on dashboard + admin notification.

> Tip: Account for supplier lead time when setting thresholds. A medicine delivered next-day can have a lower threshold than one taking a week.

### Expiry Management

- Dashboard highlights medicines expiring within 90 days
- Always dispense FEFO
- When stock expires: remove from shelves immediately, document adjustment, return to supplier if possible, or dispose per pharmaceutical waste guidelines

---

## Supplier Management

### Supplier List

Shows: company name, contact person, phone, email, address, number of medicines supplied, total purchase value, status (Active/Inactive).

### Registering a Supplier

Enter: company name, contact person, phone, email, address, GST number, drug license number.

> Note: Drug license number is required for compliance — verify before ordering.

### Adding Batches via Supplier

Open supplier detail → **Add Batch** → select medicine → enter batch details → save. This maintains the link between batches and their source for traceability.

### Batch Traceability

Each batch shows: medicine name, batch number, quantity received vs remaining, purchase price, MRP, manufacturing/expiry dates, supplier info, movement history. Essential for manufacturer recalls.

---

## Invoice Management

Every dispensing transaction produces an invoice.

### Creating an Invoice

1. Enter patient/customer details (search existing or enter manually)
2. Add medicines by search → select batch (system suggests FEFO)
3. Enter quantity, apply discount if applicable
4. Review subtotal, discount, tax, grand total
5. Process payment → print or send digitally

### Payment Modes

| Mode | Process |
|------|---------|
| **Cash** | System calculates change |
| **Card** | Process through terminal, record reference |
| **UPI** | QR code or enter reference after payment |
| **Insurance** | Verify coverage, process claim |
| **Credit** | Record as pending for later collection |

### Sales Reports

- Daily sales totals and average invoice value
- Medicine-wise sales breakdown
- Payment mode distribution
- Top selling medicines by revenue
- Trend analysis (days, weeks, months)

---

## Inventory Auditing

### Physical Verification Process

1. Generate stock report from system
2. Physically count each medicine
3. Compare physical vs system count
4. Investigate discrepancies
5. Make documented stock adjustments

### Audit Frequency

| Category | Frequency |
|----------|-----------|
| Top 20% items by sales volume | Weekly |
| Full inventory | Monthly |
| Controlled substances (Schedule H/H1) | Daily |
| Expiring items (within 90 days) | Weekly |

---

## Daily Workflow

### Opening

- [ ] Check prescription queue for pending orders
- [ ] Review low-stock alerts, initiate reorders
- [ ] Verify refrigerator temperatures for cold-chain medicines
- [ ] Check expiry alerts, remove newly expired stock

### During the Day

- [ ] Process prescriptions in order (STAT first)
- [ ] Always dispense FEFO
- [ ] Generate invoices immediately upon dispensing
- [ ] Counsel patients on dosage, timing, storage, side effects

### Closing

- [ ] Reconcile cash drawer with system sales
- [ ] Secure controlled substances
- [ ] Verify controlled substance counts

---

## Patient Counseling Essentials

Cover these for every dispensed medicine:

| Topic | What to Explain |
|-------|-----------------|
| **Dosage** | How much and how often |
| **Timing** | When to take (morning/night, before/after meals) |
| **Duration** | How long to continue full course |
| **Storage** | Temperature, light, moisture requirements |
| **Side Effects** | Common ones and when to seek help |
| **Interactions** | Foods or medicines to avoid |
| **Completion** | Importance of finishing full course (especially antibiotics) |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Medicine not found in search** | May not be in catalog — add via Medicines module. Try generic name or manufacturer. |
| **Stock shows zero but medicine is on shelf** | Batch may have expired (auto-flagged). New delivery may not be entered. Check stock history. |
| **Invoice won't print** | Check printer connection, paper, power. Restart printer. Try reprint from invoice detail. |
| **Prescription not in queue** | Doctor may not have finalized. Refresh page. Check if already processed by another pharmacist. |
| **Stock counts don't match after audit** | Review stock history for affected medicine. Check for unrecorded sales or damage. Make documented adjustment. |

---

## Getting Help

- **Clinic Admin** — Access, permissions, configuration, procurement approvals
- **Supplier** — Order issues, delivery delays, quality complaints, returns
- **Pharmacy Manager** — Operational decisions, policy, regulatory compliance
- **support@infinitymedisetu.com** — Software issues
- **?** icon — Context-sensitive guidance on any screen
