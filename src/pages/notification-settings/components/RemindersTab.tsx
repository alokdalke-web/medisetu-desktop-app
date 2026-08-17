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

// HeroUI's default surfaces don't follow this app's tokens, so the fields are
// pinned to them — otherwise they wash out against the dark page.
const FIELD_CLASSNAMES = {
  inputWrapper: "border-line bg-surface data-[hover=true]:border-primary/40",
  input: "text-text",
} as const;

const SELECT_CLASSNAMES = {
  trigger: "border-line bg-surface data-[hover=true]:border-primary/40",
  value: "text-text",
  popoverContent: "border border-line bg-surface text-text",
} as const;

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
        <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-[15px] font-semibold text-text">
                Reminders
              </h3>
              {isFreePlan && !isClinicLoading && (
                <Tooltip content="Upgrade plan to enable reminders" placement="top" showArrow>
                  <button
                    type="button"
                    onClick={() => navigate("/subscription")}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
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
                className="flex flex-col gap-3 rounded-xl border border-line bg-surface-muted p-4 sm:flex-row sm:items-center"
              >
                <p className="text-[12px] font-semibold text-text-muted sm:hidden">
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
                            classNames={FIELD_CLASSNAMES}
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
                        classNames={SELECT_CLASSNAMES}
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
                        classNames={SELECT_CLASSNAMES}
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
                  className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border transition lg:h-8 lg:w-8 ${
                    isFreePlan
                      ? "border-line bg-surface-muted text-text-subtle opacity-60"
                      : "border-danger/20 bg-danger/10 text-danger hover:bg-danger/20"
                  }`}
                >
                  <FiTrash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {fields.length === 0 && (
              <div className="rounded-xl border border-dashed border-line py-8 text-center text-[13px] text-text-muted">
                No reminders configured. Add one to get started.
              </div>
            )}
          </div>

          {/* Save */}
          <div className="mt-5 flex justify-end gap-3 border-t border-line pt-4">
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
