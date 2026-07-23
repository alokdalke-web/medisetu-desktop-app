import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";
import { clinicApi } from "./clinicApi";
import { limitationsApi } from "./limitationsApi";
import type { FeatureKey } from "./limitationsApi.types";

export type Pagination = {
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};

export type ApiSubscription = {
  id?: string | number | null;
  expireAt?: string | null;
  notes?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
  paymentMode?: string | null;
  amount?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;

  doctor?: {
    id?: string | number | null;
    name?: string | null;
    email?: string | null;
    mobile?: string | null;
    profileImage?: string | null;
    speciality?: string | null;
  };

  patient?: {
    id?: string | number | null;
    name?: string | null;
    email?: string | null;
    mobile?: string | null;
    alternateMobile?: string | null;
    profileImage?: string | null;
  };

  subscription?: {
    id?: string | number | null;
    serviceName?: string | null;
    price?: number | null;
    currency?: string | null;
    additionalServices?: string | null;
    durationMonths?: number | null;
  };
};

export type GetSubscribedPatientsArgs = {
  pageNumber: number;
  pageSize: number;

  search?: string;
  startDate?: string;
  endDate?: string;

  subscriptionId?: string;
  paymentStatus?: "paid" | "pending";
  status?: "active";
};

export type PaymentModeTotal = {
  paymentMode: string;
  amount: number;
};

export type SubscriptionSummary = {
  totalAmount: number;
  paymentModeTotals: PaymentModeTotal[];
};

export type SubscribedPatientsResponse = {
  results: ApiSubscription[];
  pagination: Pagination;
  summary?: SubscriptionSummary;
};

// ---------- new payment transactions types ----------
export type PaymentTransaction = {
  patientName?: string | null;
  patientMobile?: string | null;
  doctorName?: string | null;
  doctorSpeciality?: string | null;
  serviceName?: string | null;
  appointmentDate?: string | null;
  price?: number | null;
  entryType?: string | null; // Credit / Debit
  paymentMode?: string | null;
  refundMode?: string | null;
  refundNotes?: string | null;
  transactionId?: string | null;
  originalAppointmentId?: string | null;
};

export type PaymentTransactionsArgs = {
  pageNumber: number;
  pageSize: number;

  search?: string;
  startDate?: string;
  endDate?: string;

  doctorId?: string | string[];
  patientId?: string | string[];
  paymentMode?: string | string[];
  refundMode?: string | string[];
  paymentStatus?: "Paid" | "Refunded" | ("Paid" | "Refunded")[];
  entryType?: "Credit" | "Debit";
};

export type PaymentTransactionsResponse = {
  data: PaymentTransaction[];
  summary?: any;
  metadata?: Pagination;
};

export const PlanSlug = {
  FREE: "Free",
  PRO_MONTHLY: "pro-monthly",
} as const;

export interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  features: PlanFeature[];
}

export interface PlanFeature {
  id: string;
  planId: string;
  name: string;
  description: string;
  value: string | number | boolean | null;
  isUnlimited: boolean;
  createdAt: string;
}

/** Raw feature shape returned by the backend */
interface RawPlanFeature {
  id: string;
  planId: string;
  featureKey: string;
  displayName: string | null;
  description: string;
  type: string;
  limitValue: number | null;
  isUnlimited: boolean;
  enabled: boolean;
  sortOrder: number;
  isMarketingFeature: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlansResponse {
  success: boolean;
  message: string;
  plans: Plan[];
}

export interface BillingHistoryItem {
  id: string;
  planName: string;
  planDescription?: string;
  price: number;
  currency: string;
  startsAt: string;
  expiresAt: string;
  active: boolean;
  provider: string;
  createdAt: string;
  paymentMode?: string;
  paymentStatus?: string;
  transactionId?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicState?: string;
  clinicCity?: string;
  ZipCode?: string;
  adminName?: string;
  adminEmail?: string;
  adminMobile?: string;
}

export interface BillingHistoryResponse {
  success: boolean;
  message: string;
  data: BillingHistoryItem[];
}

// ---------- Add-on types ----------
export type BillingCycle = "monthly" | "yearly";

export interface AddOn {
  id: string;
  name: string;
  description: string;
  featureKey: string;
  unitPrice: number;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  maxQuantity: number;
  billingCycles: BillingCycle[];
}

export interface AvailableAddonsResponse {
  success: boolean;
  data: AddOn[];
}

export interface PurchaseAddonItem {
  addOnId: string;
  billingCycle: BillingCycle;
  quantity: number;
}

export interface PurchaseAddonRequest {
  addOns: PurchaseAddonItem[];
  couponCode?: string;
}

export interface PurchaseAddonResponse {
  success: boolean;
  message: string;
  data: {
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    addOns: {
      id: string;
      name: string;
      featureKey: string;
      unitValue: number;
      quantity: number;
      billingCycle: BillingCycle;
      unitPrice: number;
      fullPrice?: number;
      proRatedPrice?: number;
      remainingDays?: number;
    }[];
  };
}

export interface VerifyAddonPurchaseRequest {
  orderId: string;
  paymentId: string;
  signature: string;
  addOns: PurchaseAddonItem[];
  couponId?: string;
  originalAmount?: string;
  discountAmount?: string;
}

export interface VerifyAddonPurchaseResponse {
  success: boolean;
  message: string;
}

// ---------- Combined checkout types ----------

export interface CombinedAddOnSelection {
  addOnId: string;
  quantity: number;
}

export interface PreviewCombinedPriceRequest {
  planId: string;
  billingCycle: BillingCycle;
  addOns: CombinedAddOnSelection[];
}

export interface PreviewCombinedPriceResponse {
  success: boolean;
  data: {
    plan: { name: string; price: number };
    addOns: { name: string; totalPrice: number }[];
    subscriptionPrice: number;
    addOnsTotal: number;
    grandTotal: number;
    savings: number;
  };
}

export interface SubscribeWithAddOnsRequest {
  planId: string;
  billingCycle: BillingCycle;
  addOns: CombinedAddOnSelection[];
}

export interface SubscribeWithAddOnsResponse {
  success: boolean;
  message: string;
  data: {
    requiresPayment: boolean;
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    breakdown: {
      plan: {
        id: string;
        name: string;
        billingCycle: BillingCycle;
        price: number;
      };
      addOns: {
        addOnId: string;
        name: string;
        unitPrice: number;
        quantity: number;
        totalPrice: number;
      }[];
      subscriptionPrice: number;
      addOnsTotal: number;
      grandTotal: number;
    };
  };
}

export interface VerifyCombinedPurchaseRequest {
  orderId: string;
  paymentId: string;
  signature: string;
  planId: string;
  billingCycle: BillingCycle;
  addOns: CombinedAddOnSelection[];
}

export interface VerifyCombinedPurchaseResponse {
  success: boolean;
  message: string;
  data: {
    subscription: any;
    addOns: any[];
    totalAmount: number;
  };
}

export interface MyAddOn {
  id: string;
  addOnId: string;
  name: string;
  featureKey: FeatureKey;
  quantity: number;
  billingCycle: BillingCycle;
  status: "active" | "cancelled" | "expired";
  startsAt: string;
  expiresAt: string;
  createdAt: string;
}

export interface MyAddonsResponse {
  success: boolean;
  data: MyAddOn[];
}

// ---------- My Subscription (current plan + active add-ons) ----------

export interface MySubscriptionAddOn {
  id: string;
  addOnName: string;
  featureKey: string;
  totalQuantity: number;
  billingCycle: BillingCycle;
  latestExpiresAt: string;
  totalPrice: number;
  cancelAtPeriodEnd?: boolean;
  cancelledAt?: string | null;
}

export interface MySubscriptionUsage {
  doctors: {
    current: number;
    limit: number;
    isUnlimited: boolean;
    remaining: number;
  };
  staff: {
    current: number;
    limit: number;
    isUnlimited: boolean;
    remaining: number;
  };
}

export interface MySubscriptionData {
  subscription: {
    planName: string;
    planSlug: string;
    price: string;
    startsAt: string;
    expiresAt: string | null;
    paymentMode: string;
    paymentStatus?: string;
    providerSubscriptionId?: string | null;
    cancelAtPeriodEnd: boolean;
    cancelledAt: string | null;
    autoRenew?: boolean;
    scheduledPlanId?: string | null;
    scheduledPlanChangeAt?: string | null;
  } | null;
  hasActive: boolean;
  addOns: MySubscriptionAddOn[];
  usage: MySubscriptionUsage;
}

export interface MySubscriptionResponse {
  success: boolean;
  message: string;
  data: MySubscriptionData;
}

// ---------- Coupon Validation (Clinic-side) ----------

export interface ValidateCouponRequest {
  code: string;
  /** Plan UUID — required for coupons scoped to specific plans */
  planId?: string;
  /** Add-on UUID — required for coupons scoped to specific add-ons */
  addOnId?: string;
  billingCycle?: BillingCycle;
  orderValue: number;
}

export interface ValidateCouponResponse {
  valid: boolean;
  discountAmount: number;
  finalAmount: number;
  /** Only present when coupon is invalid — explains why */
  code?: string;
  /** Present when coupon is valid */
  coupon?: {
    id: number;
    code: string;
    discountType: string;
    discountValue: string;
    description: string | null;
  };
  message: string;
}

export interface CouponDiscountInfo {
  couponCode: string;
  couponId: number;
  discountAmount: number;
  originalAmount: number;
  finalAmount: number;
}

// ---------- Coupon Usage History ----------

export interface CouponUsageItem {
  id: number;
  couponId: number;
  clinicId: number;
  planId: number | null;
  addOnId: number | null;
  orderValue: string;
  discountAmount: string;
  finalAmount: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  billingCycle: BillingCycle | null;
  usedAt: string;
}

export interface CouponHistoryResponse {
  usages: CouponUsageItem[];
  total: number;
  page: number;
  totalPages: number;
}

export const subscriptionApi = createApi({
  reducerPath: "subscriptionApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["SubscriptionPlans", "SubscribedPatients", "PaymentTransactions", "Addons", "MyAddons", "BillingHistory"],

  endpoints: (b) => ({
    // ✅ Get subscription plans (SuperAdmin)
    getSubscriptionPlans: b.query<PlansResponse, void>({
      query: () => ({
        url: "/subscription/plans",
        method: "GET",
      }),
      providesTags: ["SubscriptionPlans"],
      transformResponse: (res: any): PlansResponse => {
        const rawPlans = res?.data ?? res?.plans ?? [];
        const plans: Plan[] = (Array.isArray(rawPlans) ? rawPlans : []).map((p: any) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          description: p.description || "",
          price: Number(p.price) || 0,
          currency: p.currency || "INR",
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          features: Array.isArray(p.features) ? p.features.map((f: any) => ({
            id: f.id,
            planId: f.planId,
            name: f.displayName || f.featureKey || f.name || "",
            description: f.description || "",
            value: f.limitValue,
            isUnlimited: f.isUnlimited ?? false,
            createdAt: f.createdAt,
          })) : [],
        }));
        return {
          success: res?.success ?? true,
          message: res?.message ?? "",
          plans,
        };
      },
    }),

    // ✅ Create subscription plan (SuperAdmin)
    createSubscriptionPlan: b.mutation<any, any>({
      query: (body) => ({
        url: "/subscription/plans",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SubscriptionPlans"],
    }),

    // ✅ Update subscription plan (SuperAdmin)
    updateSubscriptionPlan: b.mutation<any, { id: string; body: any }>({
      query: ({ id, body }) => ({
        url: `/subscription/plans/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["SubscriptionPlans"],
    }),

    // ✅ Delete subscription plan (SuperAdmin)
    deleteSubscriptionPlan: b.mutation<any, string>({
      query: (id) => ({
        url: `/subscription/plans/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SubscriptionPlans"],
    }),

    // ✅ Manage plan features (SuperAdmin)
    manageFeatures: b.mutation<
      any,
      {
        planId: string;
        body: {
          add: { name: string; description: string }[];
          update: { id: string; name: string; description: string }[];
          delete: string[];
        };
      }
    >({
      query: ({ planId, body }) => ({
        url: `/subscription/manage-features/${planId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["SubscriptionPlans"],
    }),

    // ✅ Main table API (with params)
    getSubscribedPatients: b.query<
      SubscribedPatientsResponse,
      GetSubscribedPatientsArgs
    >({
      query: (args) => ({
        url: "/doctor/subscriptions",
        method: "GET",
        params: {
          pageNumber: args.pageNumber,
          pageSize: args.pageSize,

          ...(args.search ? { search: args.search } : {}),
          ...(args.startDate ? { startDate: args.startDate } : {}),
          ...(args.endDate ? { endDate: args.endDate } : {}),
          ...(args.subscriptionId
            ? { subscriptionId: args.subscriptionId }
            : {}),
          ...(args.paymentStatus ? { paymentStatus: args.paymentStatus } : {}),
          ...(args.status ? { status: args.status } : {}),
        },
      }),

      transformResponse: (res: any, _meta, arg): SubscribedPatientsResponse => {
        const list =
          res?.results?.data ??
          res?.results ??
          res?.result?.results ??
          res?.result?.data ??
          res?.data ??
          [];

        const results: ApiSubscription[] = Array.isArray(list) ? list : [];

        const p =
          res?.pagination ??
          res?.metadata ??
          res?.result?.pagination ??
          res?.result?.metadata ??
          null;

        const pagination: Pagination = p ?? {
          totalRecords: results.length,
          totalPages: 1,
          currentPage: arg.pageNumber ?? 1,
          pageSize: arg.pageSize ?? (results.length || 1),
        };

        const summary: SubscriptionSummary | undefined =
          res?.summary ?? res?.result?.summary ?? undefined;

        return { results, pagination, summary };
      },

      providesTags: ["SubscribedPatients"],
    }),

    // payment transactions list for history (appointments)
    getPaymentTransactions: b.query<
      PaymentTransactionsResponse,
      PaymentTransactionsArgs
    >({
      query: (args) => ({
        url: "/appointments/payment-transactions",
        method: "GET",
        params: {
          pageNumber: args.pageNumber,
          pageSize: args.pageSize,

          ...(args.search ? { search: args.search } : {}),
          ...(args.startDate ? { startDate: args.startDate } : {}),
          ...(args.endDate ? { endDate: args.endDate } : {}),

          ...(args.doctorId ? { doctorId: args.doctorId } : {}),
          ...(args.patientId ? { patientId: args.patientId } : {}),
          ...(args.paymentMode ? { paymentMode: args.paymentMode } : {}),
          ...(args.refundMode ? { refundMode: args.refundMode } : {}),
          ...(args.paymentStatus ? { paymentStatus: args.paymentStatus } : {}),
          ...(args.entryType ? { entryType: args.entryType } : {}),
        },
      }),
      transformResponse: (res: any, _meta, arg): PaymentTransactionsResponse => {
        const data = Array.isArray(res?.data) ? res.data : [];
        const metadata: Pagination =
          res?.metadata ??
          res?.pagination ??
          (arg && {
            totalRecords: data.length,
            totalPages: 1,
            currentPage: arg.pageNumber,
            pageSize: arg.pageSize,
          });
        const summary = res?.summary;
        return { data, metadata, summary };
      },
      providesTags: ["PaymentTransactions"],
    }),

    // ✅ Validate coupon code (clinic-side preview)
    validateCoupon: b.mutation<
      ValidateCouponResponse,
      ValidateCouponRequest
    >({
      query: (body) => ({
        url: "/subscription/coupons/validate",
        method: "POST",
        body,
      }),
      transformResponse: (res: any): ValidateCouponResponse => {
        const d = res?.data ?? res;
        return {
          valid: d?.valid ?? false,
          discountAmount: d?.discountAmount ?? 0,
          finalAmount: d?.finalAmount ?? 0,
          code: d?.code,
          coupon: d?.coupon,
          message: res?.message ?? "",
        };
      },
    }),

    // ✅ Get clinic's coupon usage history
    getCouponHistory: b.query<CouponHistoryResponse, { page?: number; limit?: number }>({
      query: ({ page = 1, limit = 20 } = {}) => ({
        url: "/subscription/coupons/my-history",
        method: "GET",
        params: { page, limit },
      }),
      transformResponse: (res: any): CouponHistoryResponse => {
        const d = res?.data ?? res;
        return {
          usages: d?.usages ?? [],
          total: d?.total ?? 0,
          page: d?.page ?? 1,
          totalPages: d?.totalPages ?? 1,
        };
      },
    }),

    // SIMPLE SUBSCRIBE CALL
    subscribe: b.mutation<{ message: string }, { planId: string }>({
      query: (body) => ({
        url: "/subscription/subscribe",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SubscriptionPlans", "BillingHistory"],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(clinicApi.util.invalidateTags(["Clinic"]));
          dispatch(limitationsApi.util.invalidateTags(["Limitations"]));
        } catch {
          // ignore
        }
      },
    }),

    initialSubscribe: b.mutation<{ message: string }, { planId: string }>({
      query: (body) => ({
        url: "/subscription/initial-subscribe",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SubscriptionPlans", "BillingHistory"],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(clinicApi.util.invalidateTags(["Clinic"]));
          dispatch(limitationsApi.util.invalidateTags(["Limitations"]));
        } catch {
          // ignore
        }
      },
    }),

    createRazorpayOrder: b.mutation<
      {
        success: boolean;
        requiresPayment: boolean;
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
        planId: string;
        discount?: {
          couponCode: string;
          couponId: number;
          discountAmount: number;
          originalAmount: number;
          finalAmount: number;
        };
      },
      {
        planId: string;
        providerSubscriptionId?: string;
        couponCode?: string;
      }
    >({
      query: (body) => ({
        url: "/subscription/subscribe",
        method: "POST",
        body,
      }),
      transformResponse: (res: any) => {
        // API wraps in { success, message, data: { ... } }
        const d = res?.data ?? res;
        return {
          success: res?.success ?? d?.success ?? true,
          requiresPayment: d?.requiresPayment ?? false,
          orderId: d?.orderId ?? "",
          amount: d?.amount ?? 0,
          currency: d?.currency ?? "INR",
          keyId: d?.keyId ?? "",
          planId: d?.planId ?? "",
          discount: d?.discount ?? undefined,
        };
      },
    }),

    verifyRazorpayPayment: b.mutation<
      {
        success: boolean;
        message: string;
        subscription: any;
        staffReactivated?: number;
        doctorsReactivated?: number;
      },
      {
        orderId: string;
        paymentId: string;
        signature: string;
        planId: string;
        paymentMethod?: string;
        providerSubscriptionId?: string;
        couponId?: string;
        originalAmount?: string;
        discountAmount?: string;
      }
    >({
      query: (body) => ({
        url: "/subscription/verify-subscription",
        method: "POST",
        body,
      }),
      transformResponse: (res: any) => {
        const d = res?.data ?? res;
        return {
          success: res?.success ?? true,
          message: res?.message ?? "Payment verified",
          subscription: d?.subscription ?? null,
          staffReactivated: d?.staffReactivated ?? 0,
          doctorsReactivated: d?.doctorsReactivated ?? 0,
        };
      },
      invalidatesTags: ["SubscriptionPlans", "BillingHistory", "MyAddons"],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(clinicApi.util.invalidateTags(["Clinic"]));
          dispatch(limitationsApi.util.invalidateTags(["Limitations"]));
        } catch {
          // ignore
        }
      },
    }),

    // get all plans
    getAllPlans: b.query<PlansResponse, void>({
      query: () => ({
        url: "/subscription/plans",
        method: "GET",
      }),
      providesTags: ["SubscriptionPlans"],
      transformResponse: (res: any): PlansResponse => {
        const rawPlans = res?.data ?? res?.plans ?? [];

        /** Convert snake_case feature keys to human-readable labels */
        const featureKeyToLabel = (key: string): string => {
          const labelMap: Record<string, string> = {
            doctor_accounts: "Doctor",
            receptionist_accounts: "Staff Member",
            whatsapp_messages_per_month: "WhatsApp Messages / Month",
            patient_history_months: "Patient Data",
            storage_months: "Storage",
            appointment_management: "Appointment Management",
            patient_management: "Patient Management",
            billing_management: "Billing",
            basic_billing: "Basic Billing",
            advanced_billing: "Advanced Billing",
            reports_access: "Reports Access",
            lab_module: "Lab Module Access",
            pharmacy_module: "Pharmacy Module Access",
            priority_support: "Priority Support",
            dashboard_full_access: "Full Dashboard Access",
            multi_branch: "Multi-Branch Support",
            custom_integrations: "Custom Integrations",
            sla_support: "SLA Support",
            call_reception: "Call Reception",
            referral_management: "Referral Management",
            patient_records: "Patient Records",
            staff_accounts: "Staff Member",
            doctors_included: "Doctors Included",
            staff_included: "Staff Members Included",
            full_patient_history: "Full Patient History Access",
          };
          if (labelMap[key]) return labelMap[key];
          // Fallback: convert snake_case to Title Case
          return key
            .split("_")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
        };

        /** Format the display name with count/limit info */
        const formatFeatureName = (f: RawPlanFeature): string => {
          const label = f.displayName || featureKeyToLabel(f.featureKey);

          // Boolean features — just show the label
          if (f.type === "boolean") return label;

          // Unlimited features
          if (f.isUnlimited) return `Unlimited ${label}`;

          // Features with a numeric limit
          if (f.limitValue !== null && f.limitValue !== undefined && f.limitValue > 0) {
            // Patient history: "Last X Months Patient Data"
            if (f.featureKey.includes("history") || f.featureKey === "patient_history_months") {
              return `Last ${f.limitValue} Months ${label}`;
            }
            // Storage: "500 MB Storage" or "2 GB Storage"
            if (f.featureKey.includes("storage")) {
              const storageLabel = f.limitValue >= 1000
                ? `${f.limitValue / 1000} GB`
                : `${f.limitValue} MB`;
              return `${storageLabel} ${label}`;
            }
            // WhatsApp messages: "100 WhatsApp Messages / Month"
            if (f.featureKey.includes("whatsapp")) {
              return `${f.limitValue} ${label}`;
            }
            // Count-based (doctors, staff, etc.): "2 Doctors Included" / "1 Staff Member"
            return `${f.limitValue} ${label}${f.limitValue > 1 && !label.endsWith("s") ? "s" : ""}`;
          }

          return label;
        };

        const plans: Plan[] = (Array.isArray(rawPlans) ? rawPlans : []).map((p: any) => {
          const rawFeatures: RawPlanFeature[] = Array.isArray(p.features) ? p.features : [];
          // Show enabled features (marketing first), limited to 8
          const features: PlanFeature[] = rawFeatures
            .filter((f) => f.enabled === true)
            .sort((a, b) => {
              if (a.isMarketingFeature && !b.isMarketingFeature) return -1;
              if (!a.isMarketingFeature && b.isMarketingFeature) return 1;
              return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
            })
            .slice(0, 8)
            .map((f) => ({
              id: f.id,
              planId: f.planId,
              name: formatFeatureName(f),
              description: f.description || "",
              value: f.limitValue,
              isUnlimited: f.isUnlimited,
              createdAt: f.createdAt,
            }));
          return {
            id: p.id,
            slug: p.slug,
            name: p.name,
            description: p.description || "",
            price: Number(p.price) || 0,
            currency: p.currency || "INR",
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            features,
          };
        });
        return {
          success: res?.success ?? true,
          message: res?.message ?? "",
          plans,
        };
      },
    }),

    getBillingHistory: b.query<BillingHistoryResponse, void>({
      query: () => ({
        url: "/subscription/billing-history",
        method: "GET",
      }),
      providesTags: ["BillingHistory"],
    }),

    // ✅ Get available add-ons
    getAvailableAddons: b.query<AvailableAddonsResponse, void>({
      query: () => ({
        url: "/subscription/addons/available",
        method: "GET",
      }),
      providesTags: ["Addons"],
      transformResponse: (res: any): AvailableAddonsResponse => {
        const rawAddons = res?.data ?? [];

        // Feature keys or names to hide from the UI (not yet available)
        const HIDDEN_FEATURE_KEYS = ["dashboard_full_access", "additional_branch", "branch"];
        const HIDDEN_NAMES = ["additional branch"];

        const data: AddOn[] = (Array.isArray(rawAddons) ? rawAddons : []).map((a: any) => {
          const monthly = Number(a.pricing?.monthly ?? a.monthlyPrice ?? 0);
          const yearly = Number(a.pricing?.yearly ?? a.yearlyPrice ?? 0);
          const featureKey = a.featureKey || "";
          const name = (a.name || "").toLowerCase();
          const isHidden = HIDDEN_FEATURE_KEYS.includes(featureKey) || HIDDEN_NAMES.some((h) => name.includes(h));
          return {
            id: a.id,
            name: a.name || "",
            description: a.description || "",
            featureKey,
            unitPrice: monthly,
            monthlyPrice: monthly,
            yearlyPrice: yearly,
            currency: a.currency || "INR",
            maxQuantity: isHidden ? 0 : (a.maxQuantity ?? 50),
            billingCycles: a.billingCycles ?? ["monthly", "yearly"],
          };
        });
        return { success: res?.success ?? true, data };
      },
    }),

    // ✅ Purchase add-on (creates Razorpay order)
    purchaseAddon: b.mutation<PurchaseAddonResponse, PurchaseAddonRequest>({
      query: (body) => ({
        url: "/subscription/addons/purchase",
        method: "POST",
        body,
      }),
    }),

    // ✅ Verify add-on purchase
    verifyAddonPurchase: b.mutation<VerifyAddonPurchaseResponse, VerifyAddonPurchaseRequest>({
      query: (body) => ({
        url: "/subscription/addons/verify-purchase",
        method: "POST",
        body,
      }),
      invalidatesTags: ["MyAddons", "BillingHistory"],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(limitationsApi.util.invalidateTags(["Limitations"]));
        } catch {
          // ignore
        }
      },
    }),

    // ✅ Get my active add-ons
    getMyAddons: b.query<MyAddonsResponse, void>({
      query: () => ({
        url: "/subscription/addons/my-addons",
        method: "GET",
      }),
      providesTags: ["MyAddons"],
    }),

    // ✅ Get current subscription + active add-ons
    getMySubscription: b.query<MySubscriptionResponse, void>({
      query: () => ({
        url: "/subscription/my-subscription",
        method: "GET",
      }),
      providesTags: ["SubscriptionPlans", "MyAddons"],
    }),

    // ✅ Cancel an active add-on (immediate)
    cancelAddon: b.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/subscription/addons/cancel/${id}`,
        method: "PUT",
      }),
      invalidatesTags: ["MyAddons", "BillingHistory"],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(limitationsApi.util.invalidateTags(["Limitations"]));
        } catch {
          // ignore
        }
      },
    }),

    // ✅ Reduce add-on quantity
    reduceAddonQuantity: b.mutation<
      { success: boolean; message: string; data: any },
      { clinicAddOnId: string; reduceBy?: number }
    >({
      query: ({ clinicAddOnId, reduceBy = 1 }) => ({
        url: `/subscription/addons/reduce-quantity/${clinicAddOnId}`,
        method: "PUT",
        body: { reduceBy },
      }),
      invalidatesTags: ["MyAddons", "SubscriptionPlans"],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(limitationsApi.util.invalidateTags(["Limitations"]));
        } catch {
          // ignore
        }
      },
    }),

    // ✅ Schedule add-on cancellation at end of period
    scheduleAddonCancel: b.mutation<
      { success: boolean; message: string; data: any },
      { clinicAddOnId: string; reason?: string }
    >({
      query: ({ clinicAddOnId, reason }) => ({
        url: `/subscription/addons/schedule-cancel/${clinicAddOnId}`,
        method: "PUT",
        body: reason ? { reason } : undefined,
      }),
      invalidatesTags: ["MyAddons", "SubscriptionPlans"],
    }),

    // ✅ Undo scheduled add-on cancellation
    undoAddonCancel: b.mutation<
      { success: boolean; message: string; data: any },
      string
    >({
      query: (clinicAddOnId) => ({
        url: `/subscription/addons/undo-cancel/${clinicAddOnId}`,
        method: "PUT",
      }),
      invalidatesTags: ["MyAddons", "SubscriptionPlans"],
    }),

    // ✅ Schedule subscription cancellation at end of period
    scheduleSubscriptionCancel: b.mutation<
      { success: boolean; message: string; data: { cancelAtPeriodEnd: boolean; expiresAt: string } },
      { reason?: string }
    >({
      query: (body) => ({
        url: "/subscription/schedule-cancel",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["SubscriptionPlans", "MyAddons"],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(clinicApi.util.invalidateTags(["Clinic"]));
        } catch {
          // ignore
        }
      },
    }),

    // ✅ Get auto-renewal status
    getAutoRenewStatus: b.query<
      { success: boolean; data: { autoRenew: boolean; pendingAuthorization?: boolean; canEnable: boolean; reason?: string; expiresAt?: string; cancelAtPeriodEnd?: boolean } },
      void
    >({
      query: () => ({
        url: "/subscription/auto-renew/status",
        method: "GET",
      }),
      providesTags: ["SubscriptionPlans"],
    }),

    // ✅ Subscribe to a paid plan WITH AutoPay (pay now + auto-renew)
    subscribeWithAutoPay: b.mutation<
      { success: boolean; message: string; data: { subscriptionId: string; shortUrl: string; status: string; amount: number; keyId: string; planId: string; billingCycle: string } },
      { planId: string; billingCycle?: "monthly" | "yearly" }
    >({
      query: (body) => ({
        url: "/subscription/subscribe-autopay",
        method: "POST",
        body,
      }),
      transformResponse: (res: any) => {
        const d = res?.data ?? res;
        return {
          success: res?.success ?? true,
          message: res?.message ?? "",
          data: {
            subscriptionId: d?.subscriptionId ?? "",
            shortUrl: d?.shortUrl ?? "",
            status: d?.status ?? "",
            amount: d?.amount ?? 0,
            keyId: d?.keyId ?? "",
            planId: d?.planId ?? "",
            billingCycle: d?.billingCycle ?? "monthly",
          },
        };
      },
    }),

    // ✅ Enable auto-renewal
    enableAutoRenew: b.mutation<
      { success: boolean; message: string; data: { enabled: boolean; pendingAuthorization?: boolean; shortUrl?: string } },
      void
    >({
      query: () => ({
        url: "/subscription/auto-renew/enable",
        method: "POST",
      }),
      invalidatesTags: ["SubscriptionPlans"],
    }),

    // ✅ Disable auto-renewal
    disableAutoRenew: b.mutation<
      { success: boolean; message: string; data: { enabled: boolean } },
      void
    >({
      query: () => ({
        url: "/subscription/auto-renew/disable",
        method: "POST",
      }),
      invalidatesTags: ["SubscriptionPlans"],
    }),

    // ✅ Undo scheduled subscription cancellation
    undoSubscriptionCancel: b.mutation<
      { success: boolean; message: string; data: any },
      void
    >({
      query: () => ({
        url: "/subscription/undo-cancel",
        method: "PUT",
      }),
      invalidatesTags: ["SubscriptionPlans", "MyAddons"],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(clinicApi.util.invalidateTags(["Clinic"]));
        } catch {
          // ignore
        }
      },
    }),

    // ✅ Schedule a plan downgrade at end of billing period
    schedulePlanDowngrade: b.mutation<
      { success: boolean; message: string; data: { scheduledPlan: { id: string; name: string; slug: string }; effectiveAt: string } },
      { targetPlanId: string; billingCycle?: "monthly" | "yearly" }
    >({
      query: (body) => ({
        url: "/subscription/schedule-downgrade",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["SubscriptionPlans", "MyAddons"],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(clinicApi.util.invalidateTags(["Clinic"]));
        } catch {
          // ignore
        }
      },
    }),

    // ✅ Undo a scheduled plan downgrade
    undoScheduledPlanChange: b.mutation<
      { success: boolean; message: string; data: any },
      void
    >({
      query: () => ({
        url: "/subscription/undo-downgrade",
        method: "PUT",
      }),
      invalidatesTags: ["SubscriptionPlans", "MyAddons"],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(clinicApi.util.invalidateTags(["Clinic"]));
        } catch {
          // ignore
        }
      },
    }),

    // ✅ Retry a failed / pending subscription payment (creates a fresh order)
    retrySubscriptionPayment: b.mutation<
      {
        success: boolean;
        requiresPayment: boolean;
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
        planId: string;
        providerSubscriptionId?: string;
      },
      void
    >({
      query: () => ({
        url: "/subscription/payment/retry",
        method: "POST",
      }),
      transformResponse: (res: any) => {
        const d = res?.data ?? res;
        return {
          success: res?.success ?? true,
          requiresPayment: d?.requiresPayment ?? true,
          orderId: d?.orderId ?? "",
          amount: d?.amount ?? 0,
          currency: d?.currency ?? "INR",
          keyId: d?.keyId ?? "",
          planId: d?.planId ?? "",
          providerSubscriptionId: d?.providerSubscriptionId,
        };
      },
    }),

    // ✅ Cancel clinic subscription
    cancelSubscription: b.mutation<
      {
        success: boolean;
        message: string;
        data: {
          warnings: string[];
          doctorsDeactivated: { id: string; name: string | null; email: string | null }[];
          staffDeactivated: { id: string; name: string | null; email: string | null; userType: string }[];
        };
      },
      string
    >({
      query: (subscriptionId) => ({
        url: `/subscription/cancel/${subscriptionId}`,
        method: "PUT",
      }),
      invalidatesTags: ["SubscriptionPlans", "MyAddons", "BillingHistory"],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(clinicApi.util.invalidateTags(["Clinic"]));
          dispatch(limitationsApi.util.invalidateTags(["Limitations"]));
        } catch {
          // ignore
        }
      },
    }),

    // ✅ Reactivate deactivated staff after plan upgrade
    reactivateStaff: b.mutation<
      {
        success: boolean;
        message: string;
        data: {
          doctorsReactivated: number;
          staffReactivated: number;
        };
      },
      void
    >({
      query: () => ({
        url: "/subscription/limitations/reactivate-staff",
        method: "POST",
      }),
      invalidatesTags: ["SubscriptionPlans"],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(limitationsApi.util.invalidateTags(["Limitations"]));
        } catch {
          // ignore
        }
      },
    }),

    // ✅ Enforce staff limits manually (Super Admin)
    enforceStaffLimits: b.mutation<
      {
        success: boolean;
        data: {
          doctorsDeactivated: { id: string; name: string; email: string }[];
          staffDeactivated: { id: string; name: string; email: string; userType: string }[];
          warnings: string[];
        };
      },
      { clinicId: string }
    >({
      query: (body) => ({
        url: "/subscription/limitations/enforce-staff-limits",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SubscriptionPlans"],
    }),

    // ✅ Preview combined price (plan + add-ons)
    previewCombinedPrice: b.mutation<PreviewCombinedPriceResponse, PreviewCombinedPriceRequest>({
      query: (body) => ({
        url: "/subscription/preview-combined-price",
        method: "POST",
        body,
      }),
    }),

    // ✅ Subscribe with add-ons in one order
    subscribeWithAddOns: b.mutation<SubscribeWithAddOnsResponse, SubscribeWithAddOnsRequest>({
      query: (body) => ({
        url: "/subscription/subscribe-with-addons",
        method: "POST",
        body,
      }),
    }),

    // ✅ Verify combined purchase (plan + add-ons)
    verifyCombinedPurchase: b.mutation<VerifyCombinedPurchaseResponse, VerifyCombinedPurchaseRequest>({
      query: (body) => ({
        url: "/subscription/verify-combined-purchase",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SubscriptionPlans", "MyAddons", "BillingHistory"],
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(clinicApi.util.invalidateTags(["Clinic"]));
          dispatch(limitationsApi.util.invalidateTags(["Limitations"]));
        } catch {
          // ignore
        }
      },
    }),
  }),
});

export const {
  useGetSubscribedPatientsQuery,
  useGetPaymentTransactionsQuery,
  useSubscribeMutation,
  useInitialSubscribeMutation,
  useGetAllPlansQuery,
  useGetBillingHistoryQuery,
  useGetSubscriptionPlansQuery,
  useCreateSubscriptionPlanMutation,
  useUpdateSubscriptionPlanMutation,
  useDeleteSubscriptionPlanMutation,
  useManageFeaturesMutation,
  useCreateRazorpayOrderMutation,
  useVerifyRazorpayPaymentMutation,
  useGetAvailableAddonsQuery,
  usePurchaseAddonMutation,
  useVerifyAddonPurchaseMutation,
  useGetMyAddonsQuery,
  useGetMySubscriptionQuery,
  useCancelAddonMutation,
  useReduceAddonQuantityMutation,
  useScheduleAddonCancelMutation,
  useUndoAddonCancelMutation,
  useScheduleSubscriptionCancelMutation,
  useUndoSubscriptionCancelMutation,
  useSchedulePlanDowngradeMutation,
  useUndoScheduledPlanChangeMutation,
  useRetrySubscriptionPaymentMutation,
  useGetAutoRenewStatusQuery,
  useSubscribeWithAutoPayMutation,
  useEnableAutoRenewMutation,
  useDisableAutoRenewMutation,
  useCancelSubscriptionMutation,
  useReactivateStaffMutation,
  useEnforceStaffLimitsMutation,
  usePreviewCombinedPriceMutation,
  useSubscribeWithAddOnsMutation,
  useVerifyCombinedPurchaseMutation,
  useValidateCouponMutation,
  useGetCouponHistoryQuery,
} = subscriptionApi;
