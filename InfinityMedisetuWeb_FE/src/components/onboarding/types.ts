import React from "react";
import { FiUser, FiHome, FiCreditCard, FiActivity, FiClock } from "react-icons/fi";

export type StepKey =  "clinic" |"profile" |"services" | "availability" | "subscription";

export const steps: { key: StepKey; label: string; description: string; icon: React.ElementType; timeEstimate?: string }[] = [
  { key: "clinic", label: "Create Clinic", description: "Basic details to get started", icon: FiHome, timeEstimate: "1-2 min" },
  { key: "profile", label: "Your Profile", description: "Tell us about yourself", icon: FiUser, timeEstimate: "1 min" },
  { key: "services", label: "Services & Pricing", description: "Add services and fees", icon: FiActivity, timeEstimate: "1 min" },
  { key: "availability", label: "Basic Setup", description: "Set important preferences", icon: FiClock, timeEstimate: "2 min" },
  { key: "subscription", label: "Review & Submit", description: "Review and submit details", icon: FiCreditCard, timeEstimate: "1 min" },
];

export type Completion = {
  // Data existence checks (for enabling next steps)
  hasProfile: boolean;
  hasClinic: boolean;
  hasServices: boolean;
  hasAvailability: boolean;
  hasSubscription: boolean;
  // Completion status (for visual checkmarks) - based on currentStep
  isProfileCompleted: boolean;
  isClinicCompleted: boolean;
  isServicesCompleted: boolean;
  isAvailabilityCompleted: boolean;
  isSubscriptionCompleted: boolean;
  completedCount: number;
  total: number;
  percent: number;
};
