import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Switch,
  Button,
  addToast,
} from "@heroui/react";
import {
  LuLock,
  LuCalendar,
  LuCalendarClock,
  LuCalendarCheck,
  LuCalendarX,
  LuUserMinus,
  LuCreditCard,
  LuFlaskConical,
  LuClipboardList,
  LuUpload,
  LuFileText,
  LuUserPlus,
  LuBellRing,
  LuBell,
  LuRotateCcw,
} from "react-icons/lu";
import ProfilePageHeader from "../../components/shared/ProfilePageHeader";
import {
  useGetClinicSettingsQuery,
  useUpsertClinicSettingsMutation,
} from "../../redux/api/clinicApi";
import {
  useGetResolvedNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
  useLazyGetDefaultNotificationPreferencesQuery,
} from "../../redux/api/settingApi";
import AppButton from "../../components/shared/AppButton";

interface SettingsForm {
  voiceCallEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  loginAlertsEnabled: boolean;
  autoLogoutMinutes: number | null;
  reminders: any[];
}

interface EventInfo {
  name: string;
  description: string;
}

const EVENT_MAPPING: Record<string, EventInfo> = {
  appointment_created: { name: "Appointment Created", description: "When a new appointment is booked." },
  appointment_rescheduled: { name: "Appointment Rescheduled", description: "When an appointment time is updated." },
  appointment_confirmed: { name: "Appointment Confirmed", description: "When an appointment is confirmed." },
  appointment_canceled: { name: "Appointment Canceled", description: "When an appointment is canceled." },
  appointment_no_show: { name: "Appointment No-Show", description: "When a patient doesn't show up." },
  payment_received: { name: "Payment Received", description: "When an invoice is paid." },
  test_assigned_to_lab: { name: "Test Assigned to Lab", description: "When a new lab test is assigned." },
  test_log_created: { name: "Test Log Created", description: "When a lab assistant starts a log." },
  test_report_uploaded: { name: "Test Report Uploaded", description: "When a report PDF is uploaded." },
  pdf_ready: { name: "Prescription PDF Ready", description: "When a prescription PDF is available." },
  user_created: { name: "User Account Created", description: "When a new user is registered." },
};

const getEventIcon = (key: string) => {
  switch (key) {
    case "appointment_created": return LuCalendar;
    case "appointment_rescheduled": return LuCalendarClock;
    case "appointment_confirmed": return LuCalendarCheck;
    case "appointment_canceled": return LuCalendarX;
    case "appointment_no_show": return LuUserMinus;
    case "payment_received": return LuCreditCard;
    case "test_assigned_to_lab": return LuFlaskConical;
    case "test_log_created": return LuClipboardList;
    case "test_report_uploaded": return LuUpload;
    case "pdf_ready": return LuFileText;
    case "user_created": return LuUserPlus;
    default: return LuBellRing;
  }
};

const ClinicSettings: React.FC = () => {
  const { data: settingsData } = useGetClinicSettingsQuery();

  const [upsertSettings, { isLoading: isUpdating }] =
    useUpsertClinicSettingsMutation();

  // Notification Preferences
  const { data: prefData } = useGetResolvedNotificationPreferencesQuery();
  const [updatePref, { isLoading: isUpdatingPref }] = useUpdateNotificationPreferencesMutation();
  const [getDefaults, { isFetching: isFetchingDefaults }] = useLazyGetDefaultNotificationPreferencesQuery();
  const [localPreferences, setLocalPreferences] = React.useState<any>(null);

  useEffect(() => {
    if (prefData?.success && prefData.data) {
      setLocalPreferences(prefData.data);
    }
  }, [prefData]);

  const allKeys = React.useMemo(() => {
    if (!localPreferences) return [];
    return Array.from(new Set([
      ...Object.keys(localPreferences.inApp || {}),
      ...Object.keys(localPreferences.push || {})
    ]));
  }, [localPreferences]);

  const handleToggle = (channel: "inApp" | "push", eventKey: string, newValue: boolean) => {
    if (!localPreferences) return;
    setLocalPreferences({
      ...localPreferences,
      [channel]: {
        ...localPreferences[channel],
        [eventKey]: {
          ...localPreferences[channel][eventKey],
          enabled: newValue,
        },
      },
    });
  };

  const handleResetToDefaults = async () => {
    try {
      const res = await getDefaults().unwrap();
      if (res.success && res.data) {
        setLocalPreferences(res.data);
        addToast({
          title: "Reset Complete",
          description: "Preferences reset to defaults. Click Save to confirm.",
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
  };

  // Keep existing form for settings submission (preserves API contract)
  const { handleSubmit, reset } = useForm<SettingsForm>({
    defaultValues: {
      voiceCallEnabled: false,
      smsEnabled: false,
      whatsappEnabled: false,
      loginAlertsEnabled: false,
      autoLogoutMinutes: null,
      reminders: [],
    },
  });

  useEffect(() => {
    if (settingsData?.success && settingsData.result) {
      const { settings, reminders } = settingsData.result;
      reset({
        voiceCallEnabled: settings?.voiceCallEnabled ?? false,
        smsEnabled: settings?.smsEnabled ?? false,
        whatsappEnabled: settings?.whatsappEnabled ?? false,
        loginAlertsEnabled: settings?.loginAlertsEnabled ?? false,
        autoLogoutMinutes: settings?.autoLogoutMinutes ?? null,
        reminders: reminders ?? [],
      });
    }
  }, [settingsData, reset]);

  const onSubmit = async (data: SettingsForm) => {
    try {
      // Save existing settings (preserves reminders etc.)
      const payload = {
        settings: {
          voiceCallEnabled: data.voiceCallEnabled,
          smsEnabled: data.smsEnabled,
          whatsappEnabled: data.whatsappEnabled,
          loginAlertsEnabled: data.loginAlertsEnabled,
          autoLogoutMinutes: data.autoLogoutMinutes,
        },
        reminders: data.reminders,
      };

      // Build preference diffs
      const updatePayload: any = {};
      if (localPreferences && prefData?.data) {
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

        if (Object.keys(inAppDiffs).length > 0) updatePayload.inApp = inAppDiffs;
        if (Object.keys(pushDiffs).length > 0) updatePayload.push = pushDiffs;
      }

      const promises: Promise<any>[] = [upsertSettings(payload).unwrap()];
      if (updatePayload.inApp || updatePayload.push) {
        promises.push(updatePref(updatePayload).unwrap());
      }

      await Promise.all(promises);

      addToast({
        title: "Saved",
        description: "Notification preferences updated.",
        color: "success",
      });
    } catch {
      addToast({
        title: "Error",
        description: "Failed to update notification preferences.",
        color: "danger",
      });
    }
  };

  return (
    <div className="space-y-0">
      <ProfilePageHeader
        icon={<LuBell className="h-4 w-4" />}
        title="My Notifications"
        description="Choose how you receive notifications for different events."
        actions={
          <Button
            size="sm"
            variant="flat"
            color="default"
            className="font-medium text-[12px]"
            onPress={handleResetToDefaults}
            isLoading={isFetchingDefaults}
            startContent={<LuRotateCcw size={13} />}
          >
            Reset Defaults
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="px-5 sm:px-6 py-5">
          {/* Alert Configuration Table */}
          {localPreferences ? (
            <div className="rounded-xl border border-slate-200 bg-white dark:border-[#273244] dark:bg-[#111726] overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_72px_72px] sm:grid-cols-[1fr_90px_90px] gap-2 px-4 py-3 bg-slate-50/80 dark:bg-[#0f1728] border-b border-slate-200 dark:border-[#273244] text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <div>Notification Event</div>
                <div className="text-center">In-App</div>
                <div className="text-center">Push</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-slate-100 dark:divide-[#273244]">
                {allKeys.length > 0 ? (
                  allKeys.map((key) => {
                    const inAppSetting = localPreferences.inApp?.[key];
                    const pushSetting = localPreferences.push?.[key];
                    const mapping = EVENT_MAPPING[key] || { name: key.replace(/_/g, " "), description: "" };
                    const inAppConfigurable = inAppSetting?.configurable ?? false;
                    const pushConfigurable = pushSetting?.configurable ?? false;
                    const inAppEnabled = inAppSetting?.enabled ?? false;
                    const pushEnabled = pushSetting?.enabled ?? false;
                    const EventIcon = getEventIcon(key);

                    return (
                      <div key={key} className="grid grid-cols-[1fr_72px_72px] sm:grid-cols-[1fr_90px_90px] gap-2 px-4 py-3 items-center transition-colors hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/8 text-primary">
                            <EventIcon size={13} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[13px] font-medium text-slate-800 dark:text-white truncate">{mapping.name}</span>
                              {(!inAppConfigurable || !pushConfigurable) && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 dark:bg-[#273244] px-1 py-0.5 text-[8px] font-medium text-slate-400">
                                  <LuLock size={7} />
                                </span>
                              )}
                            </div>
                            {mapping.description && (
                              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5 line-clamp-1">{mapping.description}</p>
                            )}
                          </div>
                        </div>

                        {/* In-App */}
                        <div className="flex justify-center">
                          {inAppSetting ? (
                            <Switch
                              isSelected={inAppEnabled}
                              onValueChange={(val) => handleToggle("inApp", key, val)}
                              size="sm"
                              isDisabled={!inAppConfigurable}
                              aria-label={`In-app for ${mapping.name}`}
                            />
                          ) : <span className="text-[11px] text-slate-300">—</span>}
                        </div>

                        {/* Push */}
                        <div className="flex justify-center">
                          {pushSetting ? (
                            <Switch
                              isSelected={pushEnabled}
                              onValueChange={(val) => handleToggle("push", key, val)}
                              size="sm"
                              isDisabled={!pushConfigurable}
                              aria-label={`Push for ${mapping.name}`}
                            />
                          ) : <span className="text-[11px] text-slate-300">—</span>}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-4 py-10 text-center text-[13px] text-slate-400 dark:text-slate-500">
                    No configurable notifications available for your role.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-[#273244] bg-slate-50 dark:bg-[#0f1728] p-10 text-center text-[13px] text-slate-400">
              Loading notification preferences...
            </div>
          )}
        </div>

        {/* Save Actions */}
        <div className="flex justify-end gap-3 px-5 sm:px-6 py-4 border-t border-slate-100 dark:border-[#273244]">
          <AppButton
            text="Cancel"
            onPress={() => {
              if (prefData?.success && prefData.data) {
                setLocalPreferences(prefData.data);
              }
            }}
            buttonVariant="outlined"
            className="text-[13px]"
          />
          <AppButton
            text={isUpdating || isUpdatingPref ? "Saving..." : "Save Changes"}
            type="submit"
            buttonVariant="primary"
            isDisabled={isUpdating || isUpdatingPref}
            className="text-[13px]"
          />
        </div>
      </form>
    </div>
  );
};

export default ClinicSettings;
