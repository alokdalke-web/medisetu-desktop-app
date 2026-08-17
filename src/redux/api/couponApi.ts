import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export type CouponDiscountType = "percentage" | "fixed" | "trial";

export type CouponAppliesTo =
  | "all"
  | "plans"
  | "addons"
  | "specific_plans"
  | "specific_addons";

export type CouponStatus = "active" | "inactive" | "expired";

export interface Coupon {
  id: number;
  code: string;
  description: string | null;
  discountType: CouponDiscountType;
  discountValue: string; // API returns as string (decimal)
  maxDiscountAmount: string | null;
  trialDays: number | null;
  appliesTo: CouponAppliesTo;
  applicablePlanIds: number[] | null;
  applicableAddOnIds: number[] | null;
  maxUses: number | null;
  maxUsesPerClinic: number;
  minOrderValue: string | null;
  firstTimeOnly: boolean; // If true, only valid for first-time subscribers
  startsAt: string;
  expiresAt: string;
  status: CouponStatus;
  currentUses: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

/** Payload for creating a coupon */
export interface CreateCouponPayload {
  code: string;
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  trialDays?: number | null;
  appliesTo: CouponAppliesTo;
  applicablePlanIds?: number[];
  applicableAddOnIds?: number[];
  maxUses?: number | null;
  maxUsesPerClinic?: number;
  minOrderValue?: number | null;
  firstTimeOnly?: boolean;
  startsAt: string;
  expiresAt: string;
}

/** Payload for updating a coupon (all fields optional) */
export type UpdateCouponPayload = Partial<CreateCouponPayload> & {
  status?: CouponStatus;
};

export interface CouponsListResponse {
  success: boolean;
  message: string;
  data: {
    coupons: Coupon[];
    total: number;
    page: number;
    totalPages: number;
  };
}

export interface CouponDetailResponse {
  success: boolean;
  message: string;
  data: Coupon;
}

export interface CouponStatsResponse {
  success: boolean;
  message: string;
  data: {
    totalUses: number;
    totalDiscountAmount: number;
    uniqueClinics: number;
  };
}

export interface GetCouponsArgs {
  page?: number;
  limit?: number;
  status?: CouponStatus | "";
}

// ──────────────────────────────────────────────────────────
// API Slice
// ──────────────────────────────────────────────────────────

export const couponApi = createApi({
  reducerPath: "couponApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["Coupons"],

  endpoints: (b) => ({
    // ✅ List all coupons (paginated + filter by status)
    getCoupons: b.query<CouponsListResponse["data"], GetCouponsArgs>({
      query: ({ page = 1, limit = 20, status } = {}) => ({
        url: "/subscription/coupons",
        method: "GET",
        params: {
          page,
          limit,
          ...(status ? { status } : {}),
        },
      }),
      transformResponse: (res: any) => {
        const data = res?.data ?? res;
        return {
          coupons: data?.coupons ?? [],
          total: data?.total ?? 0,
          page: data?.page ?? 1,
          totalPages: data?.totalPages ?? 1,
        };
      },
      providesTags: ["Coupons"],
    }),

    // ✅ Get single coupon by ID
    getCouponById: b.query<Coupon, number>({
      query: (id) => ({
        url: `/subscription/coupons/${id}`,
        method: "GET",
      }),
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_result, _err, id) => [{ type: "Coupons", id }],
    }),

    // ✅ Create a new coupon
    createCoupon: b.mutation<Coupon, CreateCouponPayload>({
      query: (body) => ({
        url: "/subscription/coupons",
        method: "POST",
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ["Coupons"],
    }),

    // ✅ Update an existing coupon
    updateCoupon: b.mutation<Coupon, { id: number; body: UpdateCouponPayload }>({
      query: ({ id, body }) => ({
        url: `/subscription/coupons/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: ["Coupons"],
    }),

    // ✅ Delete (soft) a coupon
    deleteCoupon: b.mutation<void, number>({
      query: (id) => ({
        url: `/subscription/coupons/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Coupons"],
    }),

    // ✅ Get coupon statistics
    getCouponStats: b.query<CouponStatsResponse["data"], number>({
      query: (id) => ({
        url: `/subscription/coupons/${id}/stats`,
        method: "GET",
      }),
      transformResponse: (res: any) => res?.data ?? res,
    }),
  }),
});

export const {
  useGetCouponsQuery,
  useGetCouponByIdQuery,
  useCreateCouponMutation,
  useUpdateCouponMutation,
  useDeleteCouponMutation,
  useGetCouponStatsQuery,
} = couponApi;
