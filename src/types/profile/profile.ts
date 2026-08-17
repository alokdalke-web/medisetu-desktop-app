import type React from "react";

export type Role = "Admin" | "Doctor" | "Patient" | "Receptionist" | "Pharmacist" | "Lab_Assistant";

export type MenuKey =
  | "overview"
  | "clinic"
  | "services"
  | "availability"
  | "medicines"
  | "subscription"
  | "security"
  | "noLoss"
  | "referral"
  | "prescriptionTemplates"
  | "labReportTemplate"
  | "prescriptionPreference"
  | "prescriptionScanner"
  | "contactSupport"
  | "noShowPolicy"
  | "cancellationPolicy"
  | "paymentVisibility"
  | "notificationSettings"
  | "onlineBookingSettings"
  | "appUpdates";

/** Sidebar grouping only — has no bearing on routing or role access. */
export type ProfileSection =
  | "account"
  | "clinic"
  | "prescribing"
  | "pharmacy"
  | "policies"
  | "referrals";

export type MenuItem = {
  key: MenuKey;
  to: string;
  label: string;
  icon: React.ReactNode;
  section: ProfileSection;
};

/** Shape of the context `Profile.tsx` passes to every sub-route via `<Outlet context={...}>`. */
export type ProfileOutletContext = {
  doctorId: string;
};
