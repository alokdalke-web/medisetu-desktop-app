import type { AddOn } from "../../redux/api/subscriptionApi";

/**
 * Static fallback data for the Subscription & Billing page.
 *
 * These are used when the backend has no corresponding API (coupons, the Custom
 * plan card, the smart recommendation) or as a fallback when an API returns
 * nothing (add-on catalog). They are intentionally presentational placeholders.
 */

/** Add-on catalog fallback — mirrors the design mock. */
export const FALLBACK_ADDONS: AddOn[] = [
  {
    id: "addon-doctor",
    name: "Additional Doctor",
    description: "Add an extra doctor account",
    featureKey: "doctor_accounts",
    unitPrice: 499,
    monthlyPrice: 499,
    yearlyPrice: 5389,
    currency: "INR",
    maxQuantity: 50,
    billingCycles: ["monthly", "yearly"],
  },
  {
    id: "addon-staff",
    name: "Additional Staff Slot",
    description: "Add an extra staff account (Receptionist, Nurse, Pharmacist, Lab Assistant, Radiologist)",
    featureKey: "staff_accounts",
    unitPrice: 99,
    monthlyPrice: 99,
    yearlyPrice: 1069,
    currency: "INR",
    maxQuantity: 50,
    billingCycles: ["monthly", "yearly"],
  },
  {
    id: "addon-storage",
    name: "Additional 1 GB Storage",
    description: "Expand your storage allocation",
    featureKey: "storage_months",
    unitPrice: 199,
    monthlyPrice: 199,
    yearlyPrice: 2149,
    currency: "INR",
    maxQuantity: 100,
    billingCycles: ["monthly", "yearly"],
  },
  {
    id: "addon-branch",
    name: "Additional Branch",
    description: "Coming soon — multi-branch support",
    featureKey: "dashboard_full_access",
    unitPrice: 999,
    monthlyPrice: 999,
    yearlyPrice: 10789,
    currency: "INR",
    maxQuantity: 0,
    billingCycles: ["monthly", "yearly"],
  },
];

/**
 * @deprecated Client-side coupon codes are no longer used.
 * Coupon validation now happens server-side via POST /subscription/coupons/validate.
 * Kept temporarily for reference — safe to delete.
 */
export const COUPONS: Record<string, number> = {};

/** Static "Custom" plan card content (there is no Custom plan in the API). */
export const CUSTOM_PLAN = {
  name: "Custom",
  tagline: "For hospitals & multi-branch",
  priceLabel: "Custom Pricing",
  features: [
    "Custom Doctor Limits",
    "Custom Staff Limits",
    "Custom Storage Allocation",
    "Multi-Branch Support",
    "Dedicated Account Manager",
    "Custom Integrations",
    "Advanced Reporting",
    "SLA Support",
  ],
  ctaLabel: "Contact Sales",
};

/** Static smart-recommendation copy shown on the page. */
export const SMART_RECOMMENDATION = {
  title: "Pro Plan + 1 Additional Doctor",
  estimatedCost: "₹1,498 / month",
  reason:
    "You have reached your limits. Upgrade to Pro or add add-ons to continue growing your clinic.",
};
