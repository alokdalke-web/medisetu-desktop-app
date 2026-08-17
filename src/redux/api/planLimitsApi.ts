import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";
import type { FeatureKey } from "./limitationsApi.types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlanLimit {
  id: string;
  planId?: string;
  featureKey: FeatureKey;
  limitValue: number | null;
  isUnlimited: boolean;
  enabled: boolean;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanWithLimits {
  planId: string;
  planSlug: string;
  planName: string;
  limits: PlanLimit[];
}

export interface PlanLimitsStats {
  totalPlans: number;
  totalSubscribers: number;
  monthlyRecurringRevenue: number;
  totalFeaturesManaged: number;
}

export interface PlanLimitsUsageInsights {
  whatsappUsageReachedLimit: number;
  doctorAccountsReachedLimit: number;
  storageReachedLimit: number;
}

export interface PlanLimitsUpgradeOpportunities {
  whatsappLimitReachedClinics: number;
  doctorAccountUpgradeNeededClinics: number;
  storageUpgradeNeededClinics: number;
}

export interface AllPlanLimitsResponse {
  success: boolean;
  message?: string;
  stats?: PlanLimitsStats;
  usageInsights?: PlanLimitsUsageInsights;
  upgradeOpportunities?: PlanLimitsUpgradeOpportunities;
  data: PlanWithLimits[];
}

export interface SinglePlanLimitsResponse {
  success: boolean;
  data: PlanWithLimits;
}

export interface BulkUpdateLimitDto {
  featureKey: string;
  limitValue: number | null;
  isUnlimited: boolean;
  enabled: boolean;
  description: string;
}

export interface BulkUpdateRequest {
  planId: string;
  limits: BulkUpdateLimitDto[];
}

export interface BulkUpdateResponse {
  success: boolean;
  message: string;
  data: PlanLimit[];
}

export interface PatchLimitRequest {
  planId: string;
  featureKey: string;
  body: Partial<Pick<PlanLimit, "limitValue" | "isUnlimited" | "enabled" | "description">>;
}

export interface PatchLimitResponse {
  success: boolean;
  message: string;
  data: PlanLimit;
}

// ─── API Slice ───────────────────────────────────────────────────────────────

export const planLimitsApi = createApi({
  reducerPath: "planLimitsApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["PlanLimits"],
  endpoints: (builder) => ({
    getAllPlanLimits: builder.query<AllPlanLimitsResponse, void>({
      query: () => ({
        url: "/subscription/plan-limits/",
        method: "GET",
      }),
      providesTags: ["PlanLimits"],
    }),

    getPlanLimits: builder.query<PlanWithLimits, string>({
      query: (planId) => ({
        url: `/subscription/plan-limits/${planId}`,
        method: "GET",
      }),
      transformResponse: (response: SinglePlanLimitsResponse) => response.data,
      providesTags: (_result, _error, planId) => [
        { type: "PlanLimits", id: planId },
      ],
    }),

    bulkUpdatePlanLimits: builder.mutation<BulkUpdateResponse, BulkUpdateRequest>({
      query: ({ planId, limits }) => ({
        url: `/subscription/plan-limits/${planId}`,
        method: "PUT",
        body: { limits },
      }),
      invalidatesTags: ["PlanLimits"],
    }),

    updateSingleLimit: builder.mutation<PatchLimitResponse, PatchLimitRequest>({
      query: ({ planId, featureKey, body }) => ({
        url: `/subscription/plan-limits/${planId}/${featureKey}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["PlanLimits"],
    }),
  }),
});

export const {
  useGetAllPlanLimitsQuery,
  useGetPlanLimitsQuery,
  useBulkUpdatePlanLimitsMutation,
  useUpdateSingleLimitMutation,
} = planLimitsApi;
