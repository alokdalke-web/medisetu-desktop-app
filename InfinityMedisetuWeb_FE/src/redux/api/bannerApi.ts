// src/redux/api/bannerApi.ts
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";
import type { BannerFormValues, BannerQueryDto } from "../../schemas/banner";

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

    // ── User Facing: get eligible banners ────────────────────────────────────
    getEligibleBanners: builder.query<Banner[], string | void>({
      queryFn: async (placement, _queryApi, _extraOptions, baseQuery) => {
        const isElectron = Boolean((window as any).ipcAPI);
        if (isElectron && !navigator.onLine) {
          // Return empty array for offline electron to avoid connection refused errors
          return { data: [] };
        }

        const result = await baseQuery({
          url: "/banners/eligible",
          params: placement ? { placement } : undefined,
        });

        if (result.error) {
          if (result.error.status === "FETCH_ERROR") return { data: [] }; // Fallback
          return { error: result.error as any };
        }

        const res: any = result.data;
        let banners: Banner[] = [];
        if (Array.isArray(res?.data)) banners = res.data;
        else if (Array.isArray(res?.data?.banners)) banners = res.data.banners;
        else if (Array.isArray(res)) banners = res;

        return { data: banners };
      },
      providesTags: [{ type: "Banner", id: "ELIGIBLE" }],
    }),

    // ── User Facing: dismiss banner ──────────────────────────────────────────
    dismissBanner: builder.mutation<void, string>({
      query: (id) => ({ url: `/banners/${id}/dismiss`, method: "POST" }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        // List of all possible placements
        const placements = [
          "LOGIN_PAGE",
          "DASHBOARD_TOP",
          "DASHBOARD_SIDEBAR",
          "INSIGHTS_WIDGET",
          "APPOINTMENT_HEADER",
          "BILLING_PAGE",
        ];

        // Patch all cached queries to remove the dismissed banner
        const patches: Array<{ undo: () => void }> = [];

        // Update each placement-specific query
        placements.forEach((placement) => {
          try {
            const patch = dispatch(
              bannerApi.util.updateQueryData("getEligibleBanners", placement as any, (draft) => {
                const index = draft.findIndex((b) => b.id === id);
                if (index !== -1) {
                  draft.splice(index, 1);
                }
              })
            );
            patches.push(patch);
          } catch {
            // Ignore if this placement query doesn't exist in cache
          }
        });

        // Update undefined/generic placement query
        try {
          const patch = dispatch(
            bannerApi.util.updateQueryData("getEligibleBanners", undefined as any, (draft) => {
              const index = draft.findIndex((b) => b.id === id);
              if (index !== -1) {
                draft.splice(index, 1);
              }
            })
          );
          patches.push(patch);
        } catch {
          // Ignore if this query doesn't exist in cache
        }

        try {
          await queryFulfilled;
        } catch {
          // Revert all patches on error
          patches.forEach((patch) => patch.undo());
        }
      },
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
  useGetEligibleBannersQuery,
  useDismissBannerMutation,
  useTrackBannerMutation,
} = bannerApi;
