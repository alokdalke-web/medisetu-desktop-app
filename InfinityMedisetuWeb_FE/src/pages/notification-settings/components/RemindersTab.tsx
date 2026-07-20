import React, { useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import {
  Input,
  Button,
  Select,
  SelectItem,
  addToast,
} from "@heroui/react";
import { FiTrash2, FiPlus, FiArrowUpCircle } from "react-icons/fi";

import {
  useGetClinicSettingsQuery,
  useUpsertClinicSettingsMutation,
  useDeleteClinicReminderMutation,
  useGetAllClinicsQuery,
} from "../../../redux/api/clinicApi";
import { PlanSlug } from "../../../redux/api/subscriptionApi";
import Tooltip from "../../../components/shared/Tooltip";
import AppButton from "../../../components/shared/AppButton";
import RunningLateThresholdCard from "../../../components/appointment/RunningLateThresholdCard";
import { useNavigate } from "react-router";

interface Reminder {
  id?: string;
  timeValue: number;
  timeUnit: "Minutes" | "Hours" | "Days";
  reminderType: string;
  isActive: boolean;
}

interface ReminderForm {
  reminders: Reminder[];
}

const TIME_UNITS = ["Minutes", "Hours", "Days"] as const;

const RemindersTab: React.FC = () => {
  const navigate = useNavigate();
  const { data: settingsData } = useGetClinicSettingsQuery();
  const { data: clinicData, isLoading: isClinicLoading } = useGetAllClinicsQuery();

  const currentPlanSlug = clinicData?.subscription?.slug;
  const isFreePlan = isClinicLoading || currentPlanSlug === PlanSlug.FREE;

  const [upsertSettings, { isLoading: isSaving }] = useUpsertClinicSettingsMutation();
  const [deleteReminder] = useDeleteClinicReminderMutation();

  const { control, handleSubmit, reset, watch } = useForm<ReminderForm>({
    defaultValues: { reminders: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "reminders",
  });

  const watchedReminders = watch("reminders");

  useEffect(() => {
    if (settingsData?.success && settingsData.result) {
      reset({ reminders: settingsData.result.reminders ?? [] });
    }
  }, [settingsData, reset]);

  const handleDeleteReminder = async (index: number, id?: string) => {
    if (id) {
      try {
        await deleteReminder(id).unwrap();
        remove(index);
        addToast({ title: "Deleted", description: "Reminder removed.", color: "success" });
      } catch {
        addToast({ title: "Error", description: "Failed to delete reminder.", color: "danger" });
      }
    } else {
      remove(index);
    }
  };

  const onSubmit = async (data: ReminderForm) => {
    try {
      const settings = settingsData?.result?.settings ?? {};
      await upsertSettings({
        settings: {
          voiceCallEnabled: settings.voiceCallEnabled ?? false,
          smsEnabled: settings.smsEnabled ?? false,
          whatsappEnabled: settings.whatsappEnabled ?? false,
          loginAlertsEnabled: settings.loginAlertsEnabled ?? false,
          autoLogoutMinutes: settings.autoLogoutMinutes ?? null,
        },
        reminders: data.reminders,
      }).unwrap();

      addToast({ title: "Saved", description: "Reminders updated.", color: "success" });
    } catch {
      addToast({ title: "Error", description: "Failed to save reminders.", color: "danger" });
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-[12px] text-slate-500 dark:text-slate-400">
        Configure running late thresholds and appointment reminder timing.
      </p>

      {/* Running Late Threshold */}
      <RunningLateThresholdCard />

      {/* Appointment Reminders — full CRUD */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-[#273244] dark:bg-[#111726]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">
                Reminders
              </h3>
              {isFreePlan && !isClinicLoading && (
                <Tooltip content="Upgrade plan to enable reminders" placement="top" showArrow>
                  <button
                    type="button"
                    onClick={() => navigate("/subscription")}
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-semibold text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                  >
                    <FiArrowUpCircle className="text-amber-600" />
                    Update Plan
                  </button>
                </Tooltip>
              )}
            </div>

            <Tooltip content="Upgrade to add more reminders" isDisabled={!isFreePlan} placement="top">
              <div className={isFreePlan ? "cursor-pointer" : ""} onClick={() => { if (isFreePlan) navigate("/subscription"); }}>
                <Button
                  size="sm"
                  variant="light"
                  className="text-primary font-semibold text-[13px]"
                  isDisabled={isFreePlan}
                  onPress={() => append({ timeValue: 24, timeUnit: "Hours", reminderType: "Appointment", isActive: true })}
                  startContent={<FiPlus size={16} />}
                >
                  Add another reminder
                </Button>
              </div>
            </Tooltip>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:flex-row sm:items-center dark:border-[#273244] dark:bg-[#0f1728]"
              >
                <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 sm:hidden">
                  Reminder {index + 1}
                </p>

                <div className="flex flex-1 flex-wrap items-center gap-3">
                  {/* Time Value */}
                  <Tooltip content="Upgrade to change" isDisabled={!isFreePlan} placement="top">
                    <div className={isFreePlan ? "cursor-pointer" : ""} onClick={() => { if (isFreePlan) navigate("/subscription"); }}>
                      <Controller
                        name={`reminders.${index}.timeValue`}
                        control={control}
                        render={({ field: f }) => (
                          <Input
                            type="number"
                            size="sm"
                            variant="bordered"
                            radius="full"
                            className="w-20"
                            value={f.value?.toString() || "0"}
                            isDisabled={isFreePlan}
                            onValueChange={(val) => f.onChange(parseInt(val) || 0)}
                          />
                        )}
                      />
                    </div>
                  </Tooltip>

                  {/* Time Unit */}
                  <Controller
                    name={`reminders.${index}.timeUnit`}
                    control={control}
                    render={({ field: f }) => (
                      <Select
                        size="sm"
                        variant="bordered"
                        radius="full"
                        className="w-40"
                        isDisabled={isFreePlan}
                        selectedKeys={f.value ? [String(f.value)] : []}
                        onSelectionChange={(keys) => f.onChange(Array.from(keys)[0])}
                        renderValue={(items) => items.map((item) => <span key={item.key}>{item.key} before</span>)}
                      >
                        {TIME_UNITS.map((unit) => (
                          <SelectItem key={unit}>{unit}</SelectItem>
                        ))}
                      </Select>
                    )}
                  />

                  {/* Reminder Type */}
                  <Controller
                    name={`reminders.${index}.reminderType`}
                    control={control}
                    render={({ field: f }) => (
                      <Select
                        size="sm"
                        variant="bordered"
                        radius="full"
                        className="w-40"
                        isDisabled={isFreePlan}
                        selectedKeys={f.value ? [String(f.value)] : []}
                        onSelectionChange={(keys) => f.onChange(Array.from(keys)[0])}
                      >
                        {["Appointment", "Follow-up", "Surgery"].map((type) => (
                          <SelectItem key={type}>{type}</SelectItem>
                        ))}
                      </Select>
                    )}
                  />
                </div>

                {/* Delete */}
                <button
                  type="button"
                  disabled={isFreePlan}
                  onClick={() => {
                    if (isFreePlan) { navigate("/subscription"); return; }
                    handleDeleteReminder(index, watchedReminders[index]?.id);
                  }}
                  aria-label="Delete reminder"
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 transition ${
                    isFreePlan ? "opacity-50 cursor-pointer bg-slate-50 text-slate-400" : "bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                  }`}
                >
                  <FiTrash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {fields.length === 0 && (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-[#273244] rounded-xl text-[13px]">
                No reminders configured. Add one to get started.
              </div>
            )}
          </div>

          {/* Save */}
          <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-[#273244]">
            <AppButton
              text={isSaving ? "Saving..." : "Save Reminders"}
              type="submit"
              buttonVariant="primary"
              isDisabled={isSaving}
              className="text-[13px]"
            />
          </div>
        </div>
      </form>
    </div>
  );
};

export default RemindersTab;
