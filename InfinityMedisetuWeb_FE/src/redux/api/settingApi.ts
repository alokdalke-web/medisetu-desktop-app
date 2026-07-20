import { createApi } from "@reduxjs/toolkit/query/react";
import type { SettingUpdateDto } from "../../schemas/setting";
import { baseQueryWithAutoLogout } from "./baseQueryWithAutoLogout";

export interface PreferenceSetting {
  enabled: boolean;
  configurable: boolean;
}

export interface ResolvedPreferences {
  inApp: Record<string, PreferenceSetting>;
  push: Record<string, PreferenceSetting>;
}

export interface UpdatePreferencesPayload {
  inApp?: Record<string, boolean>;
  push?: Record<string, boolean>;
}

export const settingApi = createApi({
  reducerPath: "settingApi",
  baseQuery: baseQueryWithAutoLogout,
  tagTypes: ["Setting"],
  endpoints: (builder) => ({
    // Get all settings
    getAllSettings: builder.query<SettingUpdateDto[], void>({
      query: () => "/settings",
      providesTags: ["Setting"],
    }),

    // Update settings
    updateSettings: builder.mutation<
      SettingUpdateDto,
      Partial<SettingUpdateDto>
    >({
      query: (body) => ({
        url: "/settings",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Setting"],
    }),

    // Get Resolved Notification Preferences
    getResolvedNotificationPreferences: builder.query<{ success: boolean; data: ResolvedPreferences }, void>({
      query: () => "/settings/notification-preferences",
      providesTags: ["Setting"],
    }),

    // Update Notification Preferences
    updateNotificationPreferences: builder.mutation<{ success: boolean; data: ResolvedPreferences }, UpdatePreferencesPayload>({
      query: (body) => ({
        url: "/settings/notification-preferences",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Setting"],
    }),

    // Get default notification preferences for the role
    getDefaultNotificationPreferences: builder.query<{ success: boolean; data: ResolvedPreferences }, void>({
      query: () => "/settings/notification-preferences/defaults",
      providesTags: ["Setting"],
    }),
  }),
});

export const {
  useGetAllSettingsQuery,
  useUpdateSettingsMutation,
  useGetResolvedNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
  useLazyGetDefaultNotificationPreferencesQuery,
} = settingApi;
