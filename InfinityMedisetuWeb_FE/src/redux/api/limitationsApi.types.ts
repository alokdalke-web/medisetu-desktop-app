/** All known feature keys from the limitations API */
export type FeatureKey =
  | "dashboard_full_access"
  | "doctor_accounts"
  | "lab_integration"
  | "payment_history_months"
  | "pharmacy_integration"
  | "priority_support"
  | "receptionist_accounts"
  | "reports_analytics"
  | "smart_prescriptions"
  | "staff_accounts"
  | "storage_months"
  | "whatsapp_messages_per_month";

/** A single feature limit entry from the API response */
export interface FeatureLimit {
  featureKey: FeatureKey;
  description: string;
  enabled: boolean;
  baseLimit: number | null;
  addOnLimit: number | null;
  totalLimit: number | null;
  currentUsage: number;
  remaining: number | null;
}

/** Plan metadata from the API response */
export interface PlanInfo {
  planId: string;
  planSlug: string;
}

/** Full API response shape */
export interface LimitationsOverviewResponse {
  plan: PlanInfo;
  limits: FeatureLimit[];
}

/** Status derived by the useFeatureGate hook */
export type FeatureStatus = "enabled" | "disabled" | "limit_reached";

/** Return type of the useFeatureGate hook */
export interface FeatureGateResult {
  status: FeatureStatus;
  description: string;
  totalLimit: number | null;
  currentUsage: number;
  remaining: number | null;
  isLoading: boolean;
}
