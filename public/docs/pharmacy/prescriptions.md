---
title: Prescription Queue
description: Dispensing & queue
product: pharmacy
category: Feature Guides
order: 2
icon: 📋
---

# Prescription Queue

![Prescription queue and dispensing](/docs/images/pharmacy/pharmacy-prescriptions.svg)


The **Prescription Queue** is the primary actionable hub for the pharmacy. When doctors complete a patient consultation, the prescription is instantly routed here for dispensing and invoicing.

## Workflow & Dispensing Steps

1. **Verify Patient Identity & Doctor Details**: Review the doctor's notes and check for any special instructions or warnings.
2. **Review Medicines**: Cross-check each item in the prescription against current inventory levels and expiry dates.
3. **FEFO (First Expiry, First Out)**: Prepare physical medicines using the FEFO methodology to prevent stock write-offs.
4. **Draft the Invoice**: Choose the matching batch for each medicine, specify quantity, apply discounts, and generate the final bill.
5. **Mark as Dispensed**: Once the invoice is finalized and payment is processed, update the prescription status to **Completed**.

## Handling Out-of-Stock Situations

- Search the Medicines database for generic equivalents or active ingredients matching the prescription.
- Inform the patient about any generic brand substitutions, noting price differences and obtaining consent.
- Document any substitution directly on the invoice for future clinical reference.
- For controlled substances, consult the prescribing doctor before issuing any replacement.

## Partial Dispensing

If certain prescribed medicines are out of stock:

1. Dispense the available items.
2. Generate a partial invoice for the items dispensed.
3. Keep the prescription active or place it **On Hold** to signal that remaining items are pending fulfillment.
