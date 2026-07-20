import type { InfoTipItem } from "../components/shared/FeatureInfoTip";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FeatureTipConfig {
  title: string;
  tips: InfoTipItem[];
  guideSection: string;
  guideHeading?: string;
  linkLabel: string;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const dashboardTips: InfoTipItem[] = [
  {
    title: "Period comparison",
    description:
      "Metrics compare against the previous equivalent period. Select 'This Month' to compare vs last month.",
  },
  {
    title: "Live patient queue",
    description:
      "The queue panel updates in real-time as patients check in. Watch for growing queues — intervene early.",
  },
  {
    title: "Revenue vs appointments",
    description:
      "If revenue drops while appointments are steady, your average revenue per visit is falling. Worth investigating.",
  },
  {
    title: "No-show count",
    description:
      "A rising no-show count usually points to a reminder or scheduling issue. Review no-show analytics weekly.",
  },
];

// ─── Appointment List Page ────────────────────────────────────────────────────

export const appointmentListTips: InfoTipItem[] = [
  {
    title: "Quick book with keyboard",
    description:
      "Press 'A' anywhere on this page to instantly open the new appointment form.",
  },
  {
    title: "Filter by status",
    description:
      "Use the status dropdown to quickly isolate Scheduled, Completed, Cancelled, or No-Show appointments.",
  },
  {
    title: "Switch views",
    description:
      "Toggle between List, Card, and Calendar views using the icons in the toolbar. Calendar shows color-coded time blocks.",
  },
  {
    title: "Real-time queue",
    description:
      "When viewing today's appointments, the queue banner shows live wait times and delay indicators.",
  },
  {
    title: "Click any appointment",
    description:
      "Open the detail view to reschedule, cancel, mark no-show, add notes, upload consent docs, or bill additional services.",
  },
];

// ─── Appointment Detail Page ─────────────────────────────────────────────────

export const appointmentDetailTips: InfoTipItem[] = [
  {
    title: "Keyboard shortcuts",
    description:
      "Press 'C' to confirm appointment, 'Esc' to cancel appointment and close modals. Shortcuts are shown in button tooltips.",
  },
  {
    title: "Confirm to unlock prescription",
    description:
      "Doctors must confirm the appointment before the prescription editor becomes active.",
  },
  {
    title: "Activity history",
    description:
      "The History tab shows a complete audit trail — every action on this appointment with timestamps.",
  },
  {
    title: "Add services",
    description:
      "Bill additional procedures (lab, pharmacy, etc.) from the Services card without creating a new appointment.",
  },
  {
    title: "Consent & certificates",
    description:
      "Upload signed consent forms and generate medical certificates directly from this page.",
  },
];

// ─── New Appointment Page ────────────────────────────────────────────────────

export const newAppointmentTips: InfoTipItem[] = [
  {
    title: "Search existing patients",
    description:
      "Type a name or phone number to find existing patients. Always search before creating a new record.",
  },
  {
    title: "Check doctor availability",
    description:
      "Available slots are shown in green. Grey slots are already booked. Break times are marked separately.",
  },
  {
    title: "Token vs Time-slot",
    description:
      "Some doctors use token-based booking (first-come-first-served) while others use fixed time slots.",
  },
  {
    title: "Walk-in appointments",
    description:
      "For walk-ins, select today's date and the next available slot. Check in immediately if the doctor is free.",
  },
];

// ─── Patients Page ───────────────────────────────────────────────────────────

export const patientsTips: InfoTipItem[] = [
  {
    title: "Search by phone",
    description:
      "Phone number is the most reliable identifier. Always search by phone before creating a new patient.",
  },
  {
    title: "Avoid duplicates",
    description:
      "Duplicate records split medical history. Search thoroughly (phone, name, family member's number) before registering.",
  },
  {
    title: "Patient timeline",
    description:
      "Click any patient to see their complete history — consultations, prescriptions, lab reports, and billing in one view.",
  },
  {
    title: "Quick registration",
    description:
      "Only name and phone are required. Fill other details later when there's more time.",
  },
];

// ─── Payments History Page ───────────────────────────────────────────────────

export const paymentsTips: InfoTipItem[] = [
  {
    title: "Combine filters",
    description:
      "Filter by date + doctor + payment mode to answer specific questions (e.g., all UPI payments to Dr. Sharma in March).",
  },
  {
    title: "Payment mode breakdown",
    description:
      "The summary panel shows how revenue splits across Cash, Card, UPI — useful for cash reconciliation.",
  },
  {
    title: "Monthly export",
    description:
      "Export filtered data monthly to match against bank statements for financial reconciliation.",
  },
  {
    title: "Refund tracking",
    description:
      "Filter by status 'Refunded' to see all refunds across the clinic for a given period.",
  },
];

// ─── Subscription Page ───────────────────────────────────────────────────────

export const subscriptionTips: InfoTipItem[] = [
  {
    title: "Check your limits",
    description:
      "Your plan sets limits on doctors, staff, storage, and features. Check usage before hitting a cap.",
  },
  {
    title: "Add-ons vs upgrade",
    description:
      "Need just one more doctor slot? Buy an add-on. Need multiple features? Upgrade the plan.",
  },
  {
    title: "Yearly saves 20%",
    description:
      "Switch to yearly billing for add-ons and plans to save approximately 20% vs monthly.",
  },
  {
    title: "Instant activation",
    description:
      "Plan upgrades and add-ons activate immediately after payment — no waiting period.",
  },
];

// ─── Reports Page ────────────────────────────────────────────────────────────

export const reportsTips: InfoTipItem[] = [
  {
    title: "Date range matters",
    description:
      "Comparison period is auto-calculated by shifting back by the same duration. May 12-18 compares vs May 5-11.",
  },
  {
    title: "Export reports",
    description:
      "Download any report as PDF or Excel for monthly reviews, staff meetings, or accounting.",
  },
  {
    title: "Doctor performance",
    description:
      "Track consultation count, completion rate, and no-show rate per doctor for performance reviews.",
  },
  {
    title: "No data showing?",
    description:
      "Expand date range or remove filters. Try a broad report first, then add filters back one at a time.",
  },
];

// ─── No-Show Page ────────────────────────────────────────────────────────────

export const noShowTips: InfoTipItem[] = [
  {
    title: "Pattern recognition",
    description:
      "3+ no-shows in a short window is worth flagging. May indicate transport, reminder, or communication issues.",
  },
  {
    title: "Configure policy",
    description:
      "Click 'No-Show Policy' to set max allowed no-shows, enable auto-tracking, and define follow-up actions.",
  },
  {
    title: "Per-doctor breakdown",
    description:
      "Some doctors have higher no-show rates — usually points to scheduling or reminder issues, not the doctor.",
  },
  {
    title: "Follow up quickly",
    description:
      "Contact no-show patients same day. Most are genuine emergencies and will rebook when reached.",
  },
];

// ─── Users Page ──────────────────────────────────────────────────────────────

export const usersTips: InfoTipItem[] = [
  {
    title: "Deactivate don't delete",
    description:
      "Deactivating preserves historical data. Deleting orphans consultation history permanently.",
  },
  {
    title: "Auto-send credentials",
    description:
      "When you save a new user, login credentials are emailed to them automatically.",
  },
  {
    title: "Doctor schedules",
    description:
      "Configure availability, slot duration, and max patients from the doctor management section.",
  },
  {
    title: "Subscription limits",
    description:
      "Can't add more staff? Check your plan limits. Purchase add-ons or upgrade to add more slots.",
  },
];

// ─── Test Catalog Page ───────────────────────────────────────────────────────

export const testCatalogTips: InfoTipItem[] = [
  {
    title: "Reference ranges matter",
    description:
      "These determine which results are flagged abnormal. Get them right — the entire alert system depends on it.",
  },
  {
    title: "Disable don't delete",
    description:
      "Disabled tests hide from ordering but preserve historical data. Use this for retired tests.",
  },
  {
    title: "CSV import",
    description:
      "For bulk setup or updates, import multiple tests via CSV. Much faster than entering individually.",
  },
  {
    title: "Category organization",
    description:
      "Group tests by category (Hematology, Biochemistry, etc.) so doctors can find them quickly when ordering.",
  },
];

// ─── Profile & Settings Page ─────────────────────────────────────────────────

export const profileTips: InfoTipItem[] = [
  {
    title: "Complete before going live",
    description:
      "Finish clinic details, logo, operating hours, and doctor availability before patients start booking.",
  },
  {
    title: "Logo on documents",
    description:
      "The logo uploaded in Clinic Details appears on prescriptions, lab reports, and all printed documents.",
  },
  {
    title: "Security first",
    description:
      "Enable MFA for admin accounts. Check active sessions regularly. Terminate unrecognized ones immediately.",
  },
  {
    title: "Prescription templates",
    description:
      "Set up templates for your top 10 diagnoses — saves 3-5 minutes per consultation.",
  },
];

// ─── Pharmacy Page Tips ──────────────────────────────────────────────────────

export const prescriptionQueueTips: InfoTipItem[] = [
  {
    title: "FEFO Dispensing",
    description:
      "Always dispense medicines using FEFO (First Expiry, First Out) rules. Check the batch list for the earliest expiry date.",
  },
  {
    title: "Handle Out-of-Stock",
    description:
      "If a prescribed medicine is out of stock, consult the patient for generic alternatives with similar composition and dosage.",
  },
  {
    title: "Verify details",
    description:
      "Double check doctor notes and instructions before billing. For controlled drugs, confirm identity and contact the doctor if needed.",
  },
  {
    title: "Track order queue",
    description:
      "The queue refreshes in real-time. Process critical (STAT) prescriptions first.",
  },
];

export const medicinesTips: InfoTipItem[] = [
  {
    title: "Search smartly",
    description:
      "Search for products by brand name, generic chemical formula, or manufacturer. Filter by category for faster access.",
  },
  {
    title: "Shelf location",
    description:
      "Record exact shelf/rack locations in the detail form to help staff find items quickly on shelves.",
  },
  {
    title: "Deactivate vs Delete",
    description:
      "Deactivate inactive or retired medicines instead of deleting them to preserve transaction and prescription history.",
  },
  {
    title: "Stock indicators",
    description:
      "Pay attention to Low Stock, Critical, and Out of Stock indicators to plan purchase orders.",
  },
];

export const stockTips: InfoTipItem[] = [
  {
    title: "Batch tracking",
    description:
      "Every stock entry is batch-specific. Record accurate batch numbers, manufacturing dates, and expiry dates.",
  },
  {
    title: "Reorder thresholds",
    description:
      "Configure minimum stock thresholds. Set higher limits for high-demand items or items with long lead times.",
  },
  {
    title: "Stock adjustments",
    description:
      "Audit discrepancies by using 'Adjust Stock'. Select clear reasons (e.g. Damage, Returns, Audit) for compliance reports.",
  },
  {
    title: "Track expiry",
    description:
      "Regularly check the expiring soon section (under 90 days) to coordinate returns or discounts.",
  },
];

export const salesTips: InfoTipItem[] = [
  {
    title: "Interactive invoicing",
    description:
      "Select or create patient records, choose matching medicine batches, apply valid discounts, and process invoicing.",
  },
  {
    title: "Flexible payments",
    description:
      "Record payments across Cash, Card, UPI, or Credit. Use Pay Later for trusted patients or insurance claims.",
  },
  {
    title: "Reconcile cash",
    description:
      "Match day-end terminal and cash registers with your system's sales report before closing.",
  },
  {
    title: "Refund processing",
    description:
      "Review and log refunds carefully. Refunded invoices automatically adjust stock counts back into system inventory.",
  },
];

export const supplierTips: InfoTipItem[] = [
  {
    title: "GST & License compliance",
    description:
      "Always enter and verify the supplier's Drug License and GST numbers to comply with local healthcare laws.",
  },
  {
    title: "Batch traceability",
    description:
      "Link new stock batches to their suppliers to ensure ease of traceback in case of manufacturer recalls.",
  },
  {
    title: "Performance metrics",
    description:
      "Monitor the total purchase volume and order history of each supplier to optimize supply chains.",
  },
];

export const patientSubscriptionTips: InfoTipItem[] = [
  {
    title: "Refill reminders",
    description:
      "Track subscription schedules to prepare refills in advance, reducing patient wait times.",
  },
  {
    title: "Refill invoicing",
    description:
      "Easily generate sales invoices directly from patient subscriptions on their scheduled refill dates.",
  },
  {
    title: "Notifications",
    description:
      "Keep track of upcoming refill alerts to notify patients when their recurring medications are ready for pickup.",
  },
];
