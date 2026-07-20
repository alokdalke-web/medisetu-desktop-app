import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";
import type { FeatureKey, FeatureLimit, LimitationsOverviewResponse } from "./limitationsApi.types";

export const limitationsApi = createApi({
  reducerPath: "limitationsApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["Limitations"],
  keepUnusedDataFor: Number.MAX_SAFE_INTEGER,
  endpoints: (builder) => ({
    getLimitationsOverview: builder.query<LimitationsOverviewResponse, void>({
      query: () => ({
        url: "/subscription/limitations/overview",
        method: "GET",
      }),
      transformResponse: (response: { success: boolean; data: LimitationsOverviewResponse }) =>
        response.data,
      providesTags: ["Limitations"],
    }),
    checkFeatureLimit: builder.query<FeatureLimit, FeatureKey>({
      query: (key) => ({
        url: `/subscription/limitations/check/${key}`,
        method: "GET",
      }),
      transformResponse: (response: { success: boolean; data: FeatureLimit }) =>
        response.data,
      providesTags: ["Limitations"],
    }),
  }),
});

export const { useGetLimitationsOverviewQuery, useCheckFeatureLimitQuery } = limitationsApi;
