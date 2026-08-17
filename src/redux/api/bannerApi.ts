// src/redux/api/bannerApi.ts
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";
import type { BannerFormValues, BannerPlacement, BannerQueryDto } from "../../schemas/banner";

// ── Types ──────────────────────────────────────────────────────────────────────

export type BannerStatus = "Active" | "Paused" | "Scheduled" | "Expired" | "Draft";

export interface Banner {
  id: string;
  title: string;
  description?: string | null;
  bannerType: string;
  priority: string;
  placement: string;
  startDate: string;
  endDate: string;
  ctaText?: string | null;
  ctaUrl?: string | null;
  targetRoles?: string[] | null;
  targetClinics?: string[] | null;
  targetSpecialties?: string[] | null;
  isSponsored: boolean;
  isDismissible: boolean;
  isActive: boolean;
  status: BannerStatus;
  displayOrder: number;
  createdAt: string;
  updatedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  // ── Image support (new in v2) ──
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  imageAlt?: string | null;
  // ── Critical flag (new in v2) ──
  isCritical?: boolean;
}

export interface BannerPagination {
  total: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
}

export interface GetBannersResult {
  banners: Banner[];
  pagination: BannerPagination;
}

export type EligibleBannersByPlacement = Record<BannerPlacement, Banner[]>;

// ── Build create/update payload — strip empty strings → undefined ──────────────

function buildBannerPayload(data: BannerFormValues): Record<string, unknown> {
  // Dates: send full ISO datetime
  const startDate = data.startDate
    ? new Date(data.startDate + "T00:00:00.000Z").toISOString()
    : undefined;
  const endDate = data.endDate
    ? new Date(data.endDate + "T23:59:59.000Z").toISOString()
    : undefined;

  return {
    title: data.title,
    description: data.description?.trim() || undefined,
    bannerType: data.bannerType,
    priority: data.priority,
    placement: data.placement,
    startDate,
    endDate,
    ctaText: data.ctaText?.trim() || undefined,
    ctaUrl: data.ctaUrl?.trim() || undefined,
    // ── Image fields (new) ──
    imageUrl: data.imageUrl?.trim() || undefined,
    thumbnailUrl: data.thumbnailUrl?.trim() || undefined,
    imageAlt: data.imageAlt?.trim() || undefined,
    // ── Critical flag (new) ──
    isCritical: data.isCritical ?? false,
    // ── Targeting ──
    targetRoles: data.targetRoles?.length ? data.targetRoles : undefined,
    targetClinics: data.targetClinics?.length ? data.targetClinics : undefined,
    targetSpecialties: data.targetSpecialties?.length ? data.targetSpecialties : undefined,
    // ── Flags ── (with proper defaults)
    isSponsored: data.isSponsored ?? false,
    isDismissible: data.isDismissible ?? true,
    isActive: data.isActive ?? true,
    displayOrder: data.displayOrder ?? 0,
  };
}

// ── API Slice ──────────────────────────────────────────────────────────────────

export const bannerApi = createApi({
  reducerPath: "bannerApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["Banner"],
  endpoints: (builder) => ({

    // ── Super Admin: list all banners ────────────────────────────────────────
    getBanners: builder.query<GetBannersResult, BannerQueryDto | void>({
      query: (args) => ({
        url: "/banners",
        params: {
          pageNumber: args?.pageNumber ?? 1,
          pageSize: args?.pageSize ?? 20,
          search: args?.search || undefined,
          bannerType: args?.bannerType || undefined,
          priority: args?.priority || undefined,
          placement: args?.placement || undefined,
          status: args?.status || undefined,
          isActive: args?.isActive,
        },
      }),
      // Backend: { success, message, data: Banner[], metadata: { total, pageNumber, pageSize, totalPages } }
      transformResponse: (res: any): GetBannersResult => {
        const banners: Banner[] = Array.isArray(res?.data) ? res.data : [];
        const meta = res?.metadata ?? {};
        return {
          banners,
          pagination: {
            total: meta.total ?? banners.length,
            totalPages: meta.totalPages ?? 1,
            pageNumber: meta.pageNumber ?? 1,
            pageSize: meta.pageSize ?? 20,
          },
        };
      },
      providesTags: (result) =>
        result?.banners?.length
          ? [
              ...result.banners.map((b) => ({ type: "Banner" as const, id: b.id })),
              { type: "Banner" as const, id: "LIST" },
            ]
          : [{ type: "Banner" as const, id: "LIST" }],
    }),

    // ── Super Admin: get single banner ───────────────────────────────────────
    getBannerById: builder.query<Banner, string>({
      query: (id) => `/banners/${id}`,
      transformResponse: (res: any): Banner => res?.data ?? res,
      providesTags: (_res, _err, id) => [{ type: "Banner", id }],
    }),

    // ── Super Admin: create banner ───────────────────────────────────────────
    createBanner: builder.mutation<Banner, BannerFormValues>({
      query: (data) => ({
        url: "/banners",
        method: "POST",
        body: buildBannerPayload(data),
      }),
      invalidatesTags: [{ type: "Banner", id: "LIST" }],
    }),

    // ── Super Admin: update banner ───────────────────────────────────────────
    updateBanner: builder.mutation<Banner, { id: string; body: BannerFormValues }>({
      query: ({ id, body }) => ({
        url: `/banners/${id}`,
        method: "PUT",
        body: buildBannerPayload(body),
      }),
      invalidatesTags: (_res, _err, { id }) => [
        { type: "Banner", id },
        { type: "Banner", id: "LIST" },
      ],
    }),

    // ── Super Admin: delete banner ───────────────────────────────────────────
    deleteBanner: builder.mutation<void, string>({
      query: (id) => ({ url: `/banners/${id}`, method: "DELETE" }),
      invalidatesTags: (_res, _err, id) => [
        { type: "Banner", id },
        { type: "Banner", id: "LIST" },
      ],
    }),

    // ── Super Admin: activate banner ─────────────────────────────────────────
    activateBanner: builder.mutation<Banner, string>({
      query: (id) => ({ url: `/banners/${id}/activate`, method: "PATCH" }),
      invalidatesTags: (_res, _err, id) => [
        { type: "Banner", id },
        { type: "Banner", id: "LIST" },
      ],
    }),

    // ── Super Admin: pause banner ────────────────────────────────────────────
    pauseBanner: builder.mutation<Banner, string>({
      query: (id) => ({ url: `/banners/${id}/pause`, method: "PATCH" }),
      invalidatesTags: (_res, _err, id) => [
        { type: "Banner", id },
        { type: "Banner", id: "LIST" },
      ],
    }),

    // ── User Facing: get eligible banners for ALL placements in one call ────
    // Performance: replaces N per-placement requests with a single request.
    // [Electron] returns an empty map when offline to avoid connection-refused errors.
    getAllEligibleBanners: builder.query<EligibleBannersByPlacement, void>({
      queryFn: async (_arg, _queryApi, _extraOptions, baseQuery) => {
        const isElectron = Boolean((window as any).ipcAPI);
        if (isElectron && !navigator.onLine) {
          return { data: {} as EligibleBannersByPlacement };
        }

        const result = await baseQuery("/banners/eligible/all");

        if (result.error) {
          if (result.error.status === "FETCH_ERROR") {
            return { data: {} as EligibleBannersByPlacement };
          }
          return { error: result.error as any };
        }

        // Backend: { success, message, data: Record<placement, Banner[]> }
        const res: any = result.data;
        return { data: (res?.data ?? {}) as EligibleBannersByPlacement };
      },
      providesTags: [{ type: "Banner", id: "ELIGIBLE" }],
    }),

    // ── User Facing: dismiss banner ──────────────────────────────────────────
    // Every placement goes through getAllEligibleBanners (see BannerProvider),
    // which handles dismissal via its own local dismissed-id tracking — no
    // cache patch needed here.
    dismissBanner: builder.mutation<void, string>({
      query: (id) => ({ url: `/banners/${id}/dismiss`, method: "POST" }),
    }),

    // ── User Facing: track analytics ─────────────────────────────────────────
    // Backend expects: { eventType: 'impression' | 'click' | 'dismissal' }
    trackBanner: builder.mutation<void, { id: string; event: "impression" | "click" | "dismissal" }>({
      query: ({ id, event }) => ({
        url: `/banners/${id}/track`,
        method: "POST",
        body: { eventType: event },
      }),
    }),

    // ── User Facing: track a queue of analytics events in one request ───────
    trackBannerBatch: builder.mutation<
      void,
      { events: Array<{ bannerId: string; eventType: "impression" | "click" | "dismissal" }> }
    >({
      query: (body) => ({
        url: `/banners/track-batch`,
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useGetBannersQuery,
  useGetBannerByIdQuery,
  useCreateBannerMutation,
  useUpdateBannerMutation,
  useDeleteBannerMutation,
  useActivateBannerMutation,
  usePauseBannerMutation,
  useGetAllEligibleBannersQuery,
  useDismissBannerMutation,
  useTrackBannerMutation,
  useTrackBannerBatchMutation,
} = bannerApi;
