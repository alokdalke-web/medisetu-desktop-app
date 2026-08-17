import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AppUpdateConfig {
  id: string;
  app_name: string;
  platform: "ios" | "android";
  force_update: boolean;
  store_url: string;
  latest_version: string;
  minimum_version: string;
  created_at: string;
  updated_at: string;
}

export interface AppUpdatePayload {
  app_name: string;
  platform: "ios" | "android";
  force_update: boolean;
  store_url?: string;
  latest_version: string;
  minimum_version?: string;
}

export interface AppUpdateQueryParams {
  app_name: string;
  platform: "ios" | "android";
}

// ── API Slice ──────────────────────────────────────────────────────────────────

export const appUpdateApi = createApi({
  reducerPath: "appUpdateApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["AppUpdate"],
  endpoints: (builder) => ({
    // GET /app-update?app_name=X&platform=Y — retrieve a specific config
    getAppUpdateConfig: builder.query<AppUpdateConfig | null, AppUpdateQueryParams>({
      query: ({ app_name, platform }) => ({
        url: "/app-update",
        params: { app_name, platform },
      }),
      transformResponse: (res: any): AppUpdateConfig | null => {
        if (!res?.data) return null;
        return res.data;
      },
      providesTags: (_res, _err, { app_name, platform }) => [
        { type: "AppUpdate", id: `${app_name}:${platform}` },
      ],
    }),

    // GET all configs (fetch each app+platform combo)
    // We'll use a custom query to get all configs at once
    getAllAppUpdateConfigs: builder.query<AppUpdateConfig[], void>({
      query: () => "/app-update/all",
      transformResponse: (res: any): AppUpdateConfig[] => {
        if (Array.isArray(res?.data)) return res.data;
        if (Array.isArray(res)) return res;
        return [];
      },
      providesTags: (result) =>
        result?.length
          ? [
              ...result.map((c) => ({
                type: "AppUpdate" as const,
                id: `${c.app_name}:${c.platform}`,
              })),
              { type: "AppUpdate", id: "LIST" },
            ]
          : [{ type: "AppUpdate", id: "LIST" }],
    }),

    // POST /app-update — create config
    createAppUpdateConfig: builder.mutation<AppUpdateConfig, AppUpdatePayload>({
      query: (body) => ({
        url: "/app-update",
        method: "POST",
        body,
      }),
      transformResponse: (res: any): AppUpdateConfig => res?.data ?? res,
      invalidatesTags: [{ type: "AppUpdate", id: "LIST" }],
    }),

    // PUT /app-update — update existing config
    updateAppUpdateConfig: builder.mutation<AppUpdateConfig, AppUpdatePayload>({
      query: (body) => ({
        url: "/app-update",
        method: "PUT",
        body,
      }),
      transformResponse: (res: any): AppUpdateConfig => res?.data ?? res,
      invalidatesTags: (_res, _err, { app_name, platform }) => [
        { type: "AppUpdate", id: `${app_name}:${platform}` },
        { type: "AppUpdate", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetAppUpdateConfigQuery,
  useGetAllAppUpdateConfigsQuery,
  useCreateAppUpdateConfigMutation,
  useUpdateAppUpdateConfigMutation,
} = appUpdateApi;
