// src/pages/clinic/UpdateClinicModal.tsx
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Switch,
  addToast,
} from "@heroui/react";
import React, { useEffect, useMemo } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import {
  FiCalendar,
  FiChevronDown,
  FiClock,
  FiX
} from "react-icons/fi";
import { useUpdateDoctorMutation } from "../../redux/api/doctorApi";
import type {
  AvailabilitySlot,
  Break,
  DateAvailabilityItem,
} from "./ClinicAvailability";

/* ---------------- Helpers ---------------- */

function normalizeDateOnly(v: any): string {
  if (!v) return "";
  const s = String(v);
  if (s.includes("T")) return s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function parseTimeToMinutes(t?: string | null): number | null {
  if (!t) return null;
  const s = String(t).trim();

  // "09:00AM" / "09:00 AM"
  const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let hh = Number(m12[1]);
    const mm = Number(m12[2]);
    const ap = m12[3].toUpperCase();
    if (hh === 12) hh = 0;
    if (ap === "PM") hh += 12;
    return hh * 60 + mm;
  }

  // "09:00"
  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) return Number(m24[1]) * 60 + Number(m24[2]);

  return null;
}

function estimateSlotsCount(
  start?: string | null,
  end?: string | null,
  slotMinutes?: number
) {
  const a = parseTimeToMinutes(start);
  const b = parseTimeToMinutes(end);
  const sm = slotMinutes && slotMinutes > 0 ? slotMinutes : 30;
  if (a === null || b === null) return null;
  const diff = b - a;
  if (diff <= 0) return null;
  return Math.floor(diff / sm);
}

/* ---------------- Types ---------------- */

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;

  slot: AvailabilitySlot | null;
  allAvailability: AvailabilitySlot[];

  allDateAvailability?: DateAvailabilityItem[];

  onSaved: () => void;
};

type FormValues = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  notes?: string;
  slotMinutes: number | string;
  stepMinutes: number | string;
  breaks: Break[];
};

/* ---------------- Small UI helpers ---------------- */

const SelectLikeInput = (props: React.ComponentProps<typeof Input>) => {
  return (
    <Input
      {...props}
      variant="bordered"
      size="sm"
      classNames={{
        inputWrapper:
          "h-11 rounded-full bg-white border-slate-200 shadow-none",
        label: "text-xs font-medium text-slate-600",
        ...props.classNames,
      }}
      endContent={
        props.endContent ?? (
          <FiChevronDown className="h-4 w-4 text-slate-500" />
        )
      }
    />
  );
};

const SegBtn = ({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${active
        ? "bg-emerald-700 text-white shadow-sm"
        : "text-slate-600 hover:bg-slate-100"
      }`}
  >
    {children}
  </button>
);

/* ---------------- Component ---------------- */

const UpdateClinicModal: React.FC<Props> = ({
  isOpen,
  onOpenChange,
  slot,
  allAvailability,
  allDateAvailability = [],
  onSaved,
}) => {
  const [updateDoctor, { isLoading }] = useUpdateDoctorMutation();

  const defaults = useMemo(() => getDefaultValues(slot), [slot]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: defaults,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "breaks",
  });

  useEffect(() => {
    if (isOpen) reset(defaults);
  }, [isOpen, defaults, reset]);

  const close = () => {
    onOpenChange(false);
    reset(getDefaultValues(null));
  };

  const wDay = slot?.dayOfWeek || watch("dayOfWeek") || "Day";
  const wStart = watch("startTime");
  const wEnd = watch("endTime");
  const wSlotMinutesRaw = watch("slotMinutes");
  const wSlotMinutes = Number(wSlotMinutesRaw) > 0 ? Number(wSlotMinutesRaw) : 30;
  // const wIsAvailable = !!watch("isAvailable");
  const wBreaks = watch("breaks") || [];

  const slotsCount = estimateSlotsCount(wStart, wEnd, wSlotMinutes);

  const onSubmit = async (values: FormValues) => {
    try {
      const dayOfWeek = values.dayOfWeek || slot?.dayOfWeek || "";
      if (!dayOfWeek) {
        addToast({
          title: "Missing day",
          description: "Day is missing in form values.",
          color: "warning",
        });
        return;
      }

      const isEdit = !!slot;

      const slotMinutes =
        Number(values.slotMinutes) > 0 ? Number(values.slotMinutes) : 30;
      const stepMinutes =
        Number(values.stepMinutes) > 0 ? Number(values.stepMinutes) : 15;

      const normalizedBreaks: Break[] = (values.breaks || []).map((b) => ({
        breakType: b.breakType || null,
        startTime: b.startTime,
        endTime: b.endTime,
        status: typeof b.status === "boolean" ? b.status : true,
        notes: b.notes ?? null,
      }));

      const nextAvailability: AvailabilitySlot[] = isEdit
        ? allAvailability.map((a) => {
          const match =
            (slot?.id && a.id === slot.id) ||
            (!slot?.id && a.dayOfWeek === slot?.dayOfWeek);
          if (!match) return a;

          return {
            ...a,
            dayOfWeek,
            startTime: values.startTime,
            endTime: values.endTime,
            isAvailable: values.isAvailable,
            notes: values.notes ?? "",
            slotMinutes,
            stepMinutes,
            breaks: normalizedBreaks,
            availabilityBreak: normalizedBreaks,
            aivblityBreak: normalizedBreaks,
          };
        })
        : [
          ...allAvailability,
          {
            dayOfWeek,
            startTime: values.startTime,
            endTime: values.endTime,
            isAvailable: values.isAvailable,
            notes: values.notes ?? "",
            slotMinutes,
            stepMinutes,
            breaks: normalizedBreaks,
            availabilityBreak: normalizedBreaks,
            aivblityBreak: normalizedBreaks,
          } as any,
        ];

      // ✅ keep existing backend dateAvailability as-is (normalized)
      const existingDateAvailability: DateAvailabilityItem[] = (
        Array.isArray(allDateAvailability) ? allDateAvailability : []
      ).map((d: any) => ({
        date: normalizeDateOnly(d.date),
        isAvailable: Boolean(d.isAvailable),
        notes: d.notes ?? "",
        slotMinutes: d.slotMinutes ?? slotMinutes,
        stepMinutes: d.stepMinutes ?? stepMinutes,
        timeSlots: Array.isArray(d.timeSlots)
          ? d.timeSlots.map((t: any) => ({
            startTime: t.startTime ?? "",
            endTime: t.endTime ?? "",
            isAvailable:
              typeof t.isAvailable === "boolean" ? t.isAvailable : true,
            notes: t.notes ?? "",
          }))
          : [],
      }));

      const payload = {
        aivblity: nextAvailability.map((a) => {
          const bArr: Break[] = (a as any)?.aivblityBreak?.length
            ? (a as any).aivblityBreak
            : (a as any)?.availabilityBreak?.length
              ? (a as any).availabilityBreak
              : (a as any)?.breaks || [];

          return {
            dayOfWeek: a.dayOfWeek,
            startTime: a.startTime,
            endTime: a.endTime,
            isAvailable: (a as any).isAvailable,
            notes: (a as any).notes ?? "",
            slotMinutes:
              typeof (a as any).slotMinutes === "number"
                ? (a as any).slotMinutes
                : slotMinutes,
            stepMinutes:
              typeof (a as any).stepMinutes === "number"
                ? (a as any).stepMinutes
                : stepMinutes,
            aivblityBreak: (bArr || []).map((b) => ({
              breakType: b.breakType || "Break",
              startTime: b.startTime,
              endTime: b.endTime,
              status: typeof b.status === "boolean" ? b.status : true,
              notes: b.notes ?? "",
            })),
          };
        }),

        dateAvailability: existingDateAvailability.map((d) => ({
          date: d.date,
          isAvailable: d.isAvailable,
          notes: d.notes ?? "",
          ...(d.isAvailable
            ? {
              slotMinutes: Number(d.slotMinutes) || slotMinutes,
              stepMinutes: Number(d.stepMinutes) || stepMinutes,
              timeSlots: (d.timeSlots || []).map((ts) => ({
                startTime: ts.startTime,
                endTime: ts.endTime,
                isAvailable: ts.isAvailable,
                notes: ts.notes ?? "",
              })),
            }
            : {}),
        })),
      } as const;

      await updateDoctor(payload as any).unwrap();

      addToast({
        title: isEdit ? "Availability updated" : "Availability added",
        description: "Changes have been saved.",
        color: "success",
      });

      onSaved();
      close();
    } catch (error) {
      console.error("Update doctor availability failed:", error);
      addToast({
        title: "Save failed",
        description: "Unable to save availability. Please try again.",
        color: "danger",
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) close();
        else onOpenChange(open);
      }}
      size="2xl"
      placement="center"
      classNames={{
        base: "max-w-[820px] max-h-[92vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col",
        header: "px-6 pt-5 pb-2 flex-none",
        body: "px-6 pb-4 pt-0 flex-1 min-h-0 overflow-y-auto",
        footer: "px-6 pb-5 pt-4 flex-none",
      }}
    >
      <ModalContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex h-full min-h-0 flex-col"
        >
          {/* Keep header minimal */}
          <ModalHeader className="py-0" />

          <ModalBody>
            <div className="space-y-4">
              {/* Day Header Card (Figma-like) */}
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                      <FiCalendar className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {wDay}
                      </div>
                      <div className="text-xs text-emerald-700">
                        {wStart || "—"} - {wEnd || "—"}
                        {slotsCount !== null ? ` (${slotsCount} slots)` : ""}
                      </div>
                    </div>
                  </div>

                  <Controller
                    control={control}
                    name="isAvailable"
                    render={({ field }) => (
                      <Switch
                        size="sm"
                        isSelected={!!field.value}
                        onValueChange={field.onChange}
                        aria-label="Day availability"
                      />
                    )}
                  />
                </div>
              </div>

              {/* Daily Time Window */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-50 text-slate-600">
                    <FiClock className="h-4 w-4" />
                  </span>
                  Daily Time Window
                </div>

                <div className="grid gap-3 md:grid-cols-12 md:items-end">
                  <div className="md:col-span-5">
                    <SelectLikeInput
                      label="From"
                      labelPlacement="outside"
                      placeholder="09:00 AM"
                      {...register("startTime", { required: true })}
                    />
                  </div>

                  <div className="hidden md:col-span-2 md:flex md:justify-center">
                    <div className="mt-6 grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                      <span className="text-lg">→</span>
                    </div>
                  </div>

                  <div className="md:col-span-5">
                    <SelectLikeInput
                      label="To"
                      labelPlacement="outside"
                      placeholder="05:00 PM"
                      {...register("endTime", { required: true })}
                    />
                  </div>
                </div>
              </div>

              {/* Breaks */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                {fields.length > 0 && (
                  <div className="space-y-3">
                    {fields.map((f, index) => {
                      const t = wBreaks?.[index]?.breakType || "Lunch Break";

                      return (
                        <div
                          key={f.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                              <span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-slate-600 border border-slate-200">
                                🍴
                              </span>
                              {t}
                            </div>

                            <div className="flex items-center gap-2">
                              <Controller
                                control={control}
                                name={`breaks.${index}.status` as const}
                                render={({ field }) => (
                                  <Switch
                                    size="sm"
                                    isSelected={!!field.value}
                                    onValueChange={field.onChange}
                                    aria-label="Break status"
                                  />
                                )}
                              />
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                className="text-slate-500 hover:text-rose-600"
                                onPress={() => remove(index)}
                                aria-label="Remove break"
                                title="Remove break"
                              >
                                <FiX />
                              </Button>
                            </div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-12 md:items-end">
                            <div className="md:col-span-5">
                              <SelectLikeInput
                                label="From"
                                labelPlacement="outside"
                                placeholder="11:30 AM"
                                {...register(
                                  `breaks.${index}.startTime` as const,
                                  { required: true }
                                )}
                              />
                            </div>

                            <div className="hidden md:col-span-2 md:flex md:justify-center">
                              <div className="mt-6 grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                                <span className="text-lg">→</span>
                              </div>
                            </div>

                            <div className="md:col-span-5">
                              <SelectLikeInput
                                label="To"
                                labelPlacement="outside"
                                placeholder="12:00 PM"
                                {...register(`breaks.${index}.endTime` as const, {
                                  required: true,
                                })}
                              />
                            </div>
                          </div>

                          {/* Keep break type editable (hidden in Figma but keeps functionality) */}
                          <div className="mt-3 grid gap-3 md:grid-cols-12">
                            <div className="md:col-span-6">
                              <Input
                                size="sm"
                                variant="bordered"
                                label="Break name"
                                labelPlacement="outside"
                                placeholder="Lunch Break"
                                classNames={{
                                  inputWrapper:
                                    "h-11 rounded-full bg-white border-slate-200",
                                  label:
                                    "text-xs font-medium text-slate-600",
                                }}
                                {...register(
                                  `breaks.${index}.breakType` as const
                                )}
                              />
                            </div>
                            <div className="md:col-span-6">
                              <Input
                                size="sm"
                                variant="bordered"
                                label="Notes (optional)"
                                labelPlacement="outside"
                                placeholder="Optional"
                                classNames={{
                                  inputWrapper:
                                    "h-11 rounded-full bg-white border-slate-200",
                                  label:
                                    "text-xs font-medium text-slate-600",
                                }}
                                {...register(`breaks.${index}.notes` as const)}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    append({
                      breakType: "Lunch Break",
                      startTime: "",
                      endTime: "",
                      status: true,
                      notes: "",
                    })
                  }
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  <span>+</span> Add New Break
                </button>

                <div className="mt-4 h-px w-full bg-slate-200" />

                {/* Appointment Preferences Row (Figma-like) */}
                <div className="mt-4 grid gap-4 md:grid-cols-12">
                  {/* Appointment Preferences -> slotMinutes */}
                  <div className="md:col-span-4">
                    <div className="text-xs font-semibold text-slate-700">
                      Appointment Preferences
                    </div>
                    <div className="mt-2 inline-flex rounded-full bg-slate-100 p-1">
                      {[15, 20, 30].map((m) => (
                        <SegBtn
                          key={m}
                          active={Number(wSlotMinutes) === m}
                          onClick={() =>
                            setValue("slotMinutes", m, {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                          }
                        >
                          {m}min
                        </SegBtn>
                      ))}
                    </div>

                    {/* keep slotMinutes registered (in case user types elsewhere) */}
                    <input type="hidden" {...register("slotMinutes")} />
                  </div>

                  {/* Buffer time -> stepMinutes */}
                  <div className="md:col-span-4">
                    <Input
                      type="number"
                      min={1}
                      label="Buffer time"
                      labelPlacement="outside"
                      placeholder="10"
                      variant="bordered"
                      size="sm"
                      classNames={{
                        inputWrapper:
                          "h-11 rounded-full bg-white border-slate-200",
                        label: "text-xs font-semibold text-slate-700",
                      }}
                      {...register("stepMinutes", { required: true })}
                    />
                  </div>

                  {/* Max patients/day (UI-only) */}
                  <div className="md:col-span-4">
                    <SelectLikeInput
                      label="Max patients/day"
                      labelPlacement="outside"
                      value="No limit"
                      isReadOnly
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* (Optional) keep notes without clutter */}
            <div className="hidden">
              <Input {...register("notes")} />
            </div>
          </ModalBody>

          {/* Footer Buttons (Figma-like) */}
          <ModalFooter className="border-t border-slate-200">
            <div className="flex w-full items-center justify-end gap-3">
              <Button
                variant="bordered"
                onPress={close}
                disabled={isLoading || isSubmitting}
                className="rounded-full border-emerald-600 text-emerald-700"
              >
                Cancel Changes
              </Button>

              <Button
                type="submit"
                className="rounded-full bg-emerald-700 text-white hover:bg-emerald-800"
                isLoading={isLoading || isSubmitting}
              >
                Save Changes
              </Button>
            </div>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

/* ---------------- Defaults ---------------- */

function getDefaultValues(slot: AvailabilitySlot | null): FormValues {
  const baseBreaks = (slot as any)?.aivblityBreak?.length
    ? (slot as any).aivblityBreak
    : (slot as any)?.availabilityBreak?.length
      ? (slot as any).availabilityBreak
      : (slot as any)?.breaks || [];

  return {
    dayOfWeek: (slot as any)?.dayOfWeek ?? "",
    startTime: (slot as any)?.startTime ?? "",
    endTime: (slot as any)?.endTime ?? "",
    isAvailable:
      typeof (slot as any)?.isAvailable === "boolean"
        ? (slot as any).isAvailable
        : true,
    notes: (slot as any)?.notes ?? "",
    slotMinutes: (slot as any)?.slotMinutes ?? 30,
    stepMinutes: (slot as any)?.stepMinutes ?? 15,
    breaks: baseBreaks,
  };
}

export default UpdateClinicModal;
