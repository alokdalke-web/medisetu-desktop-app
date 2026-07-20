import { useCallback, useEffect, useMemo, useState } from "react";
import { addToast } from "@heroui/react";

import {
  useGetResolvedNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
  useLazyGetDefaultNotificationPreferencesQuery,
  type ResolvedPreferences,
} from "../../../redux/api/settingApi";
import {
  useGetClinicSettingsQuery,
  useUpsertClinicSettingsMutation,
  useGetAllClinicsQuery,
} from "../../../redux/api/clinicApi";
import { PlanSlug } from "../../../redux/api/subscriptionApi";
import { NOTIFICATION_EVENTS } from "../constants";
import type { NotificationCategory } from "../types";

export function useNotificationSettings() {
  // --- Clinic & plan info ---
  const { data: clinicData, isLoading: isClinicLoading } =
    useGetAllClinicsQuery();
  const currentPlanSlug = clinicData?.subscription?.slug;
  const isFreePlan = isClinicLoading || currentPlanSlug === PlanSlug.FREE;

  // --- Notification preferences (in-app/push per event) ---
  const { data: prefData, isLoading: isPrefLoading } =
    useGetResolvedNotificationPreferencesQuery();
  const [updatePref, { isLoading: isUpdatingPref }] =
    useUpdateNotificationPreferencesMutation();
  const [getDefaults, { isFetching: isFetchingDefaults }] =
    useLazyGetDefaultNotificationPreferencesQuery();

  // --- Clinic settings (voice, sms, whatsapp toggles) ---
  const { data: settingsData, isLoading: isSettingsLoading } =
    useGetClinicSettingsQuery();
  const [upsertSettings, { isLoading: isUpdatingSettings }] =
    useUpsertClinicSettingsMutation();

  // --- Local state ---
  const [localPreferences, setLocalPreferences] =
    useState<ResolvedPreferences | null>(null);
  const [channelToggles, setChannelToggles] = useState({
    voiceCallEnabled: false,
    smsEnabled: false,
    whatsappEnabled: false,
  });

  // Sync from API
  useEffect(() => {
    if (prefData?.success && prefData.data) {
      setLocalPreferences(prefData.data);
    }
  }, [prefData]);

  useEffect(() => {
    if (settingsData?.success && settingsData.result?.settings) {
      const s = settingsData.result.settings;
      setChannelToggles({
        voiceCallEnabled: s.voiceCallEnabled ?? false,
        smsEnabled: s.smsEnabled ?? false,
        whatsappEnabled: s.whatsappEnabled ?? false,
      });
    }
  }, [settingsData]);

  // --- Derived ---
  const isLoading = isPrefLoading || isSettingsLoading || isClinicLoading;
  const isSaving = isUpdatingPref || isUpdatingSettings;

  const eventsByCategory = useMemo(() => {
    const grouped: Record<NotificationCategory, typeof NOTIFICATION_EVENTS> = {
      appointments: [],
      payments: [],
      laboratory: [],
      documents: [],
      accounts: [],
    };
    for (const event of NOTIFICATION_EVENTS) {
      grouped[event.category].push(event);
    }
    return grouped;
  }, []);

  // --- Handlers ---
  const handleToggleEvent = useCallback(
    (channel: "inApp" | "push", eventKey: string, newValue: boolean) => {
      if (!localPreferences) return;
      setLocalPreferences((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          [channel]: {
            ...prev[channel],
            [eventKey]: {
              ...prev[channel][eventKey],
              enabled: newValue,
            },
          },
        };
      });
    },
    [localPreferences],
  );

  const handleToggleChannel = useCallback(
    (channel: keyof typeof channelToggles, value: boolean) => {
      setChannelToggles((prev) => ({ ...prev, [channel]: value }));
    },
    [],
  );

  const handleResetToDefaults = useCallback(async () => {
    try {
      const res = await getDefaults().unwrap();
      if (res.success && res.data) {
        setLocalPreferences(res.data);
        addToast({
          title: "Reset Complete",
          description: "Preferences reset to defaults. Save to confirm.",
          color: "success",
        });
      }
    } catch {
      addToast({
        title: "Error",
        description: "Failed to fetch default settings.",
        color: "danger",
      });
    }
  }, [getDefaults]);

  /** Save only the internal notification preferences (in-app/push toggles) */
  const handleSavePreferences = useCallback(async () => {
    if (!localPreferences || !prefData?.data) return;
    try {
      const orig = prefData.data;
      const inAppDiffs: Record<string, boolean> = {};
      const pushDiffs: Record<string, boolean> = {};

      Object.keys(localPreferences.inApp || {}).forEach((key) => {
        const current = localPreferences.inApp[key];
        const original = orig.inApp?.[key];
        if (current.configurable && current.enabled !== original?.enabled) {
          inAppDiffs[key] = current.enabled;
        }
      });

      Object.keys(localPreferences.push || {}).forEach((key) => {
        const current = localPreferences.push[key];
        const original = orig.push?.[key];
        if (current.configurable && current.enabled !== original?.enabled) {
          pushDiffs[key] = current.enabled;
        }
      });

      if (Object.keys(inAppDiffs).length === 0 && Object.keys(pushDiffs).length === 0) {
        addToast({ title: "No Changes", description: "Nothing to save.", color: "primary" });
        return;
      }

      const payload: Record<string, Record<string, boolean>> = {};
      if (Object.keys(inAppDiffs).length > 0) payload.inApp = inAppDiffs;
      if (Object.keys(pushDiffs).length > 0) payload.push = pushDiffs;

      await updatePref(payload).unwrap();
      addToast({ title: "Saved", description: "Notification preferences updated.", color: "success" });
    } catch {
      addToast({ title: "Error", description: "Failed to save preferences.", color: "danger" });
    }
  }, [localPreferences, prefData, updatePref]);

  /** Save only the patient communication channel toggles */
  const handleSaveChannels = useCallback(async () => {
    try {
      await upsertSettings({
        settings: channelToggles,
        reminders: settingsData?.result?.reminders ?? [],
      }).unwrap();
      addToast({ title: "Saved", description: "Channel settings updated.", color: "success" });
    } catch {
      addToast({ title: "Error", description: "Failed to save channel settings.", color: "danger" });
    }
  }, [channelToggles, settingsData, upsertSettings]);

  /** Save all (legacy — used if needed) */
  const handleSave = useCallback(async () => {
    await Promise.all([handleSavePreferences(), handleSaveChannels()]);
  }, [handleSavePreferences, handleSaveChannels]);

  return {
    isLoading,
    isSaving,
    isFreePlan,
    isFetchingDefaults,
    localPreferences,
    channelToggles,
    eventsByCategory,
    handleToggleEvent,
    handleToggleChannel,
    handleResetToDefaults,
    handleSave,
    handleSavePreferences,
    handleSaveChannels,
  };
}
