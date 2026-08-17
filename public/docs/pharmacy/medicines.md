---
title: Medicines Inventory
description: Medicines catalog
product: pharmacy
category: Feature Guides
order: 3
icon: 📦
---

# Medicines Inventory

![Medicines catalog and product setup](/docs/images/pharmacy/pharmacy-medicines.svg)


The **Medicines** module acts as the master catalog of all pharmaceutical products sold in the clinic.

## Stock Status Definitions

| Status | Threshold / Meaning | Action Required |
|--------|---------------------|-----------------|
| **In Stock** | Quantity is well above minimum reorder threshold | None. Ready for dispensing |
| **Low Stock** | Quantity has fallen below the minimum threshold | Initiate reorder with supplier |
| **Critical** | Quantity is dangerously low and close to zero | Expedite orders; check generic alternatives |
| **Out of Stock** | Quantity is exactly zero | Deactivate or label clearly to prevent ordering errors |
| **Expiring** | Batch is within 90 days of its expiry date | Prioritize dispensing via FEFO; plan returns |
| **Expired** | Past the manufacturer's expiry date | Remove from shelf immediately; adjust stock out |

## Product Search & Categories

Use the search bar to locate medicines by **Brand Name**, **Generic Formulation**, or **Manufacturer**. Filter products using predefined categories:

- **Antibiotics**
- **Analgesics & Antipyretics**
- **Chronic Care** (Diabetes, Hypertension, etc.)
- **Over-The-Counter (OTC)**
- **Vitamins & Supplements**

## Creating & Managing Products

When registering new medicines, fill out:

- Brand Name and Generic Composition.
- HSN Code (for tax filing).
- Category and packaging type (Tablet, Capsule, Strip, Bottle, Syrup).
- **Physical Rack/Shelf Location** (e.g. *Rack B, Shelf 3*).

> [!TIP]
> Recording accurate shelf locations is highly recommended. It saves time during peak clinic hours and helps junior staff quickly locate items.
