# Pharmacy & Inventory Guide

Welcome to the central Pharmacy Operations guide. This document serves as a comprehensive resource for pharmacists, assistants, and clinic administrators to manage the pharmacy workflow, inventory catalog, stock replenishment, point-of-sale invoicing, supplier data, and patient subscriptions.

---

## Prescription Queue

The **Prescription Queue** is the primary actionable hub for the pharmacy. When doctors complete a patient consultation, the prescription is instantly routed here for dispensing and invoicing.

### Workflow & Dispensing Steps

1. **Verify Patient Identity & Doctor Details**: Review the doctor’s notes and check for any special instructions or warnings.
2. **Review Medicines**: Cross-check each item in the prescription against current inventory levels and expiry dates.
3. **FEFO (First Expiry, First Out)**: Prepare physical medicines using the FEFO methodology to prevent stock write-offs.
4. **Draft the Invoice**: Choose the matching batch for each medicine, specify quantity, apply discounts, and generate the final bill.
5. **Mark as Dispensed**: Once the invoice is finalized and payment is processed, update the prescription status to **Completed**.

### Handling Out-of-Stock Situations

- Search the Medicines database for generic equivalents or active ingredients matching the prescription.
- Inform the patient about any generic brand substitutions, noting price differences and obtaining consent.
- Document any substitution directly on the invoice for future clinical reference.
- For controlled substances, consult the prescribing doctor before issuing any replacement.

### Partial Dispensing

If certain prescribed medicines are out of stock:
1. Dispense the available items.
2. Generate a partial invoice for the items dispensed.
3. Keep the prescription active or place it **On Hold** to signal that remaining items are pending fulfillment.

---

## Medicines Inventory

The **Medicines** module acts as the master catalog of all pharmaceutical products sold in the clinic.

### Stock Status Definitions

| Status | Threshold / Meaning | Action Required |
|--------|---------------------|-----------------|
| **In Stock** | Quantity is well above minimum reorder threshold | None. Ready for dispensing |
| **Low Stock** | Quantity has fallen below the minimum threshold | Initiate reorder with supplier |
| **Critical** | Quantity is dangerously low and close to zero | Expedite orders; check generic alternatives |
| **Out of Stock** | Quantity is exactly zero | Deactivate or label clearly to prevent ordering errors |
| **Expiring** | Batch is within 90 days of its expiry date | Prioritize dispensing via FEFO; plan returns |
| **Expired** | Past the manufacturer's expiry date | Remove from shelf immediately; adjust stock out |

### Product Search & Categories

Use the search bar to locate medicines by **Brand Name**, **Generic Formulation**, or **Manufacturer**. Filter products using predefined categories:
- **Antibiotics**
- **Analgesics & Antipyretics**
- **Chronic Care** (Diabetes, Hypertension, etc.)
- **Over-The-Counter (OTC)**
- **Vitamins & Supplements**

### Creating & Managing Products

When registering new medicines, fill out:
- Brand Name and Generic Composition.
- HSN Code (for tax filing).
- Category and packaging type (Tablet, Capsule, Strip, Bottle, Syrup).
- **Physical Rack/Shelf Location** (e.g. *Rack B, Shelf 3*).

> [!TIP]
> Recording accurate shelf locations is highly recommended. It saves time during peak clinic hours and helps junior staff quickly locate items.

---

## Stock Management

**Stock Management** deals with batch-wise tracking, physical stock counts, expiry audits, and inventory adjustments.

### Batch-wise Control

Medicines must be tracked by their manufacturing batch. Multiple batches of the same medicine can coexist. The system tracks:
- **Batch Number**: Unique identifier from the manufacturer.
- **Manufacturing & Expiry Dates**: System auto-alerts when expiry is within 90 days.
- **Cost Price (CP) & Maximum Retail Price (MRP)**: Keeps track of financial margins per batch.

### Stock Adjustments & Audits

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

---

## Sales & Billing

The **Sales** dashboard handles invoices, billing, returns, and daily revenue reporting.

### Point-of-Sale (POS) Invoice Flow

1. **Select Customer**: Search for existing patients or create a walk-in guest account.
2. **Add Items**: Scan barcodes or type names. The system auto-selects the oldest batch (FEFO).
3. **Apply Discounts**: If authorized, apply percentage or flat discounts.
4. **Choose Payment Mode**:
   - **Cash**: Enter cash received to view change calculations.
   - **Card**: Process via terminal and enter reference code.
   - **UPI**: Display QR code or enter transaction ID.
   - **Pay Later/Credit**: Postpone billing for corporate accounts or subscription patients.
5. **Print or Email**: Generate GST-compliant invoice receipts.

### Sales Audits & Refunds

- **Returns**: Medicines returned within the policy period must be logged as refunds. This automatically updates the stock counts of the matching batch.
- **Daily Reconciliation**: Reconcile cashier drawer registers against system reports daily to detect cash handling errors.

---

## Supplier Management

Maintaining a reliable directory of **Suppliers** ensures smooth procurement and stock traceability.

### Supplier Details

For every supplier, the system maintains:
- Company name, contact person, phone number, email, and billing address.
- **GST Number & Drug License Number** (required for compliance check).
- List of medicines supplied and historic transaction records.

### Traceability and Quality Recalls

Linking batches to specific suppliers is crucial. In the event of a manufacturer quality recall:
1. Search the recalled batch number.
2. Identify the supplying vendor immediately.
3. Run a stock adjustment to remove the batch and log the return to the vendor.

---

## Patient Subscriptions

For patients on chronic care regimens, **Patient Subscriptions** automate medicine refills and facilitate long-term care management.

### Creating a Subscription

1. Open the patient's record.
2. Choose recurring medicines and set the quantities.
3. Select the refill frequency (e.g. *Every 30 Days*, *Every 15 Days*).
4. Save the schedule and assign a delivery/pickup preference.

### Refill Queue & Notifications

- **Alerts**: The system flags upcoming refills 3 days before their scheduled date.
- **Auto-Billing**: Draft sales invoices directly from active subscriptions in a single click.
- **Notifications**: Send SMS, WhatsApp, or Email alerts informing patients that their monthly prescription refill is packaged and ready.

---

## Daily Checklist

Ensure the following tasks are completed every day:

- [ ] **Temperature Audit**: Verify refrigeration units are within standard medical ranges (2°C to 8°C).
- [ ] **Expiry Checks**: Check dashboard alerts for items reaching expiration dates and isolate them.
- [ ] **Reorder Queue**: Check low stock notifications and dispatch orders to suppliers.
- [ ] **Queue Clean-up**: Ensure all processed prescriptions are marked as **Completed**.
- [ ] **Register Reconciliation**: Match physical cash and terminal printouts with the system dashboard.
