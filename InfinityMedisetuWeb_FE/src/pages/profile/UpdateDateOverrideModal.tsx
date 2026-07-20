
// import React, { useEffect, useMemo } from "react";
// import {
//   Button,
//   Input,
//   Modal,
//   ModalBody,
//   ModalContent,
//   ModalFooter,
//   ModalHeader,
//   Switch,
//   addToast,
// } from "@heroui/react";
// import { TimeInput } from "@heroui/date-input";
// import { Time } from "@internationalized/date";
// import { Controller, useFieldArray, useForm } from "react-hook-form";
// import { FiClock, FiPlus, FiX } from "react-icons/fi";

// import { useUpdateDoctorMutation } from "../../redux/api/doctorApi";
// import type {
//   AvailabilitySlot,
//   DateAvailabilityItem,
//   DateTimeSlot,
// } from "./ClinicAvailability";

// /* ---------------- Helpers ---------------- */

// function normalizeDateOnly(v: any): string {
//   if (!v) return "";
//   const s = String(v);
//   if (s.includes("T")) return s.slice(0, 10);
//   if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
//   return s;
// }

// const pad2 = (n: number) => String(n).padStart(2, "0");

// // "07:00 AM" -> Time(7,0), "07:00 PM" -> Time(19,0), "19:00" -> Time(19,0)
// function stringToTimeValue(v: any): Time | null {
//   const s = (v ?? "").toString().trim();
//   if (!s) return null;

//   const m = s.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
//   if (!m) return null;

//   let hh = Number(m[1]);
//   const mm = Number(m[2]);
//   const mer = m[3]?.toUpperCase();

//   if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
//   if (mm < 0 || mm > 59) return null;

//   // if AM/PM present => convert to 24h
//   if (mer === "AM" || mer === "PM") {
//     if (hh < 1 || hh > 12) return null;
//     if (hh === 12) hh = 0;
//     if (mer === "PM") hh += 12;
//   } else {
//     // 24h support
//     if (hh < 0 || hh > 23) return null;
//   }

//   return new Time(hh, mm);
// }

// function timeValueToString(tv: any): string {
//   if (!tv) return "";
//   const hour24 = Number(tv.hour ?? 0);
//   const minute = Number(tv.minute ?? 0);

//   const meridiem = hour24 >= 12 ? "PM" : "AM";
//   let hour12 = hour24 % 12;
//   if (hour12 === 0) hour12 = 12;

//   return `${pad2(hour12)}:${pad2(minute)} ${meridiem}`;
// }

// /* ---------------- Types ---------------- */

// type Props = {
//   isOpen: boolean;
//   onOpenChange: (open: boolean) => void;

//   // ✅ edit one date (null => add new)
//   dateItem: DateAvailabilityItem | null;

//   // kept for parent compatibility (not used in new payload)
//   allAvailability: AvailabilitySlot[];
//   allDateAvailability: DateAvailabilityItem[];

//   onSaved: () => void;
// };

// type FormValues = {
//   date: string;
//   isAvailable: boolean;
//   notes?: string;
//   slotMinutes: number | string;
//   stepMinutes: number | string;

//   // ✅ IMPORTANT: keep DB id for existing slots
//   timeSlots: Array<
//     DateTimeSlot & {
//       id?: string; // DB timeSlot id (existing)
//     }
//   >;
// };

// /* ---------------- Component ---------------- */

// const UpdateDateOverrideModal: React.FC<Props> = ({
//   isOpen,
//   onOpenChange,
//   dateItem,


//   onSaved,
// }) => {
//   const [updateDoctor, { isLoading }] = useUpdateDoctorMutation();

//   const defaults = useMemo<FormValues>(() => {
//     return {
//       date: normalizeDateOnly(dateItem?.date) || "",
//       isAvailable:
//         typeof dateItem?.isAvailable === "boolean" ? dateItem.isAvailable : true,
//       notes: dateItem?.notes ?? "",
//       slotMinutes:
//         dateItem?.slotMinutes !== undefined && dateItem?.slotMinutes !== null
//           ? Number(dateItem.slotMinutes)
//           : 30,
//       stepMinutes:
//         dateItem?.stepMinutes !== undefined && dateItem?.stepMinutes !== null
//           ? Number(dateItem.stepMinutes)
//           : 15,
//       timeSlots: Array.isArray(dateItem?.timeSlots)
//         ? dateItem!.timeSlots.map((t) => ({
//             id: (t as any).id, // ✅ KEEP TIME SLOT ID from API
//             startTime: t.startTime ?? "",
//             endTime: t.endTime ?? "",
//             isAvailable:
//               typeof t.isAvailable === "boolean" ? t.isAvailable : true,
//             notes: (t as any).notes ?? "",
//           }))
//         : [],
//     };
//   }, [dateItem]);

//   const {
//     register,
//     control,
//     handleSubmit,
//     reset,
//     watch,
//     formState: { isSubmitting },
//   } = useForm<FormValues>({
//     defaultValues: defaults,
//   });

//   const isAvail = watch("isAvailable");

//   // ✅ FIX: stop RHF from hijacking your DB "id"
//   const { fields, append, remove } = useFieldArray({
//     control,
//     name: "timeSlots",
//     keyName: "fieldId", // ✅ internal key will be fieldId (NOT id)
//   });

//   useEffect(() => {
//     if (isOpen) reset(defaults);
//   }, [isOpen, defaults, reset]);

//   const close = () => {
//     onOpenChange(false);
//     reset(defaults);
//   };

//   const onSubmit = async (values: FormValues) => {
//     try {
//       const cleanDate = normalizeDateOnly(values.date);
//       if (!cleanDate) {
//         addToast({
//           title: "Missing date",
//           description: "Please select a date.",
//           color: "warning",
//         });
//         return;
//       }

//       const slotMinutes =
//         Number(values.slotMinutes) > 0 ? Number(values.slotMinutes) : 30;
//       const stepMinutes =
//         Number(values.stepMinutes) > 0 ? Number(values.stepMinutes) : 15;

//       // ✅ timeSlots payload rule:
//       // - existing slot => include id
//       // - new slot => no id
//       const normalizedSlots = (values.timeSlots || [])
//         .filter((ts) => ts.startTime && ts.endTime)
//         .map((ts) => {
//           const base: any = {
//             startTime: ts.startTime,
//             endTime: ts.endTime,
//             isAvailable:
//               typeof ts.isAvailable === "boolean" ? ts.isAvailable : true,
//             ...(ts.notes ? { notes: ts.notes } : {}),
//           };

//           return ts.id ? { id: ts.id, ...base } : base;
//         });

//       // ✅ IMPORTANT: do NOT send dateAvailability.id
//       const dateObj: any = {
//         date: cleanDate,
//         isAvailable: Boolean(values.isAvailable),
//         ...(values.notes ? { notes: values.notes } : { notes: "" }),
//       };

//       if (values.isAvailable) {
//         dateObj.slotMinutes = slotMinutes;
//         dateObj.stepMinutes = stepMinutes;
//         dateObj.timeSlots = normalizedSlots;
//       }

//       const payload = {
//         dateAvailability: [dateObj],
//       };

//       await updateDoctor(payload as any).unwrap();

//       addToast({
//         title: dateItem ? "Date override updated" : "Date override added",
//         description: "Changes have been saved.",
//         color: "success",
//       });

//       onSaved();
//       close();
//     } catch (error) {
//       console.error("Update date override failed:", error);
//       addToast({
//         title: "Save failed",
//         description: "Unable to save date override. Please try again.",
//         color: "danger",
//       });
//     }
//   };

//   const titleText = dateItem ? "Edit Date Override" : "Add Date Override";

//   return (
//     <Modal
//       isOpen={isOpen}
//       onOpenChange={(open) => {
//         if (!open) close();
//         else onOpenChange(open);
//       }}
//       size="2xl"
//       placement="center"
//       classNames={{
//         base: "max-w-[780px] max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col",
//         header: "px-6 pt-5 pb-2 flex-none",
//         body: "px-6 pb-4 pt-0 space-y-4 flex-1 min-h-0 overflow-y-auto",
//         footer: "px-6 pb-5 pt-3 flex-none",
//       }}
//     >
//       <ModalContent>
//         <form
//           onSubmit={handleSubmit(onSubmit)}
//           className="flex flex-col h-full min-h-0"
//         >
//           <ModalHeader className="flex flex-col gap-2">
//             <span className="text-lg font-semibold text-slate-900">
//               {titleText}
//             </span>
//           </ModalHeader>

//           <ModalBody>
//             <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
//               <div className="grid gap-3 md:grid-cols-12">
//                 <div className="md:col-span-4">
//                   <Input
//                     type="date"
//                     label="Date"
//                     labelPlacement="outside"
//                     variant="bordered"
//                     size="sm"
//                     {...register("date", { required: true })}
//                   />
//                 </div>

//                 <div className="md:col-span-5">
//                   <Input
//                     label="Notes"
//                     labelPlacement="outside"
//                     variant="bordered"
//                     size="sm"
//                     placeholder="Personal leave / Special OPD"
//                     {...register("notes")}
//                   />
//                 </div>

//                 <div className="md:col-span-3 flex items-end">
//                   <Controller
//                     control={control}
//                     name="isAvailable"
//                     render={({ field }) => (
//                       <Switch
//                         size="sm"
//                         isSelected={!!field.value}
//                         onValueChange={field.onChange}
//                       >
//                         Available
//                       </Switch>
//                     )}
//                   />
//                 </div>

//                 {isAvail && (
//                   <>
//                     <div className="md:col-span-3">
//                       <Input
//                         type="number"
//                         label="Slot Minutes"
//                         labelPlacement="outside"
//                         variant="bordered"
//                         size="sm"
//                         min={1}
//                         {...register("slotMinutes")}
//                       />
//                     </div>

//                     <div className="md:col-span-3">
//                       <Input
//                         type="number"
//                         label="Step Minutes"
//                         labelPlacement="outside"
//                         variant="bordered"
//                         size="sm"
//                         min={1}
//                         {...register("stepMinutes")}
//                       />
//                     </div>
//                   </>
//                 )}
//               </div>
//             </section>

//             {/* Time Slots */}
//             {isAvail ? (
//               <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
//                 <div className="mb-2 flex items-center justify-between">
//                   <h4 className="text-[13px] font-medium text-slate-700">
//                     Time Slots
//                   </h4>

//                   <Button
//                     size="sm"
//                     variant="flat"
//                     className="rounded-full bg-slate-100 text-xs font-medium text-slate-700"
//                     startContent={<FiPlus />}
//                     onPress={() =>
//                       append({
//                         // ✅ new slot => no id
//                         startTime: "",
//                         endTime: "",
//                         isAvailable: true,
//                         notes: "",
//                       })
//                     }
//                   >
//                     Add Slot
//                   </Button>
//                 </div>

//                 {fields.length === 0 ? (
//                   <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-[12px] text-slate-500">
//                     No time slots added. Click{" "}
//                     <span className="font-medium">Add Slot</span>.
//                   </div>
//                 ) : (
//                   <div className="space-y-3">
//                     {fields.map((f: any, slotIdx) => (
//                       <div
//                         key={f.fieldId} // ✅ use internal key
//                         className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-12"
//                       >
//                         {/* ✅ keep DB timeSlot id in form values */}
//                         <input
//                           type="hidden"
//                           {...register(`timeSlots.${slotIdx}.id` as const)}
//                         />

//                         {/* ✅ Start - TimeInput (tap segments + AM/PM) */}
//                         <div className="md:col-span-3">
//                           <Controller
//                             control={control}
//                             name={`timeSlots.${slotIdx}.startTime` as const}
//                             rules={{ required: true }}
//                             render={({ field }) => (
//                               <TimeInput
//                                 label="Start"
//                                 labelPlacement="outside"
//                                 variant="bordered"
//                                 size="sm"
//                                 granularity="minute"
//                                 hourCycle={12}
//                                 startContent={<FiClock className="text-slate-500" />}
//                                 value={stringToTimeValue(field.value)}
//                                 onChange={(v) =>
//                                   field.onChange(timeValueToString(v as any))
//                                 }
//                               />
//                             )}
//                           />
//                         </div>

//                         {/* ✅ End - TimeInput (tap segments + AM/PM) */}
//                         <div className="md:col-span-3">
//                           <Controller
//                             control={control}
//                             name={`timeSlots.${slotIdx}.endTime` as const}
//                             rules={{ required: true }}
//                             render={({ field }) => (
//                               <TimeInput
//                                 label="End"
//                                 labelPlacement="outside"
//                                 variant="bordered"
//                                 size="sm"
//                                 granularity="minute"
//                                 hourCycle={12}
//                                 startContent={<FiClock className="text-slate-500" />}
//                                 value={stringToTimeValue(field.value)}
//                                 onChange={(v) =>
//                                   field.onChange(timeValueToString(v as any))
//                                 }
//                               />
//                             )}
//                           />
//                         </div>

//                         <div className="md:col-span-4">
//                           <Input
//                             size="sm"
//                             variant="bordered"
//                             label="Notes"
//                             labelPlacement="outside"
//                             placeholder="Evening OPD"
//                             {...register(`timeSlots.${slotIdx}.notes` as const)}
//                           />
//                         </div>

//                         <div className="md:col-span-2 flex items-end justify-between gap-2">
//                           <Controller
//                             control={control}
//                             name={`timeSlots.${slotIdx}.isAvailable` as const}
//                             render={({ field }) => (
//                               <Switch
//                                 size="sm"
//                                 isSelected={!!field.value}
//                                 onValueChange={field.onChange}
//                               >
//                                 Available
//                               </Switch>
//                             )}
//                           />

//                           <Button
//                             isIconOnly
//                             size="sm"
//                             variant="light"
//                             className="text-red-500"
//                             onPress={() => remove(slotIdx)}
//                             aria-label="Remove slot"
//                           >
//                             <FiX />
//                           </Button>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </section>
//             ) : (
//               <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-[12px] text-slate-500">
//                 This date is marked as{" "}
//                 <span className="font-medium">Not Available</span>.
//               </div>
//             )}
//           </ModalBody>

//           <ModalFooter className="border-t border-slate-200">
//             <Button
//               variant="light"
//               onPress={close}
//               disabled={isLoading || isSubmitting}
//             >
//               Cancel
//             </Button>
//             <Button
//               type="submit"
//               className="bg-emerald-600 text-white hover:bg-emerald-700"
//               isLoading={isLoading || isSubmitting}
//             >
//               Save
//             </Button>
//           </ModalFooter>
//         </form>
//       </ModalContent>
//     </Modal>
//   );
// };

// export default UpdateDateOverrideModal;

// src/pages/clinic/UpdateDateOverrideModal.tsx
import React, { useEffect, useMemo } from "react";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  addToast,
} from "@heroui/react";
import { TimeInput } from "@heroui/date-input";
import { Time } from "@internationalized/date";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { FiPlus, FiTrash2 } from "react-icons/fi";

import { useUpdateDoctorMutation } from "../../redux/api/doctorApi";
import type { AvailabilitySlot, DateAvailabilityItem } from "./ClinicAvailability";

/* ---------------- Helpers ---------------- */

function normalizeDateOnly(v: any): string {
  if (!v) return "";
  const s = String(v);
  if (s.includes("T")) return s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

// "07:00 AM" -> Time(7,0), "07:00 PM" -> Time(19,0), "19:00" -> Time(19,0)
function stringToTimeValue(v: any): Time | null {
  const s = (v ?? "").toString().trim();
  if (!s) return null;

  const m = s.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!m) return null;

  let hh = Number(m[1]);
  const mm = Number(m[2]);
  const mer = m[3]?.toUpperCase();

  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (mm < 0 || mm > 59) return null;

  // AM/PM -> 24h
  if (mer === "AM" || mer === "PM") {
    if (hh < 1 || hh > 12) return null;
    if (hh === 12) hh = 0;
    if (mer === "PM") hh += 12;
  } else {
    if (hh < 0 || hh > 23) return null;
  }

  return new Time(hh, mm);
}

function timeValueToString(tv: any): string {
  if (!tv) return "";
  const hour24 = Number(tv.hour ?? 0);
  const minute = Number(tv.minute ?? 0);

  const meridiem = hour24 >= 12 ? "PM" : "AM";
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;

  return `${pad2(hour12)}:${pad2(minute)} ${meridiem}`;
}

function ddMon(yyyyMmDd: string) {
  // just for showing header like "22 Jul 2026"
  if (!yyyyMmDd) return "—";
  const d = new Date(yyyyMmDd + "T00:00:00");
  if (Number.isNaN(d.getTime())) return yyyyMmDd;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/* ---------------- Types ---------------- */

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;

  // existing single edit still supported (we’ll prefill first card)
  dateItem: DateAvailabilityItem | null;

  // kept for parent compatibility
  allAvailability: AvailabilitySlot[];
  allDateAvailability: DateAvailabilityItem[];

  onSaved: () => void;
};

type ExceptionType = "FULL_DAY_LEAVE" | "CUSTOM_WORKING_HOURS";

type LeaveForm = {
  date: string; // YYYY-MM-DD
  exceptionType: ExceptionType;
  fromTime: string; // "09:00 AM"
  toTime: string;   // "05:00 PM"
};

type FormValues = {
  leaves: LeaveForm[];
};

/* ---------------- Component ---------------- */

const UpdateDateOverrideModal: React.FC<Props> = ({
  isOpen,
  onOpenChange,
  dateItem,
  allDateAvailability,
  onSaved,
}) => {
  const [updateDoctor, { isLoading }] = useUpdateDoctorMutation();

  const defaults = useMemo<FormValues>(() => {
    // If edit one item -> open modal with single card prefilled
    if (dateItem) {
      const hasSlots = Array.isArray(dateItem.timeSlots) && dateItem.timeSlots.length > 0;

      // If marked not available OR no slots => FULL DAY
      const exceptionType: ExceptionType =
        !dateItem.isAvailable || !hasSlots ? "FULL_DAY_LEAVE" : "CUSTOM_WORKING_HOURS";

      const firstSlot = hasSlots ? dateItem.timeSlots[0] : null;

      return {
        leaves: [
          {
            date: normalizeDateOnly(dateItem.date),
            exceptionType,
            fromTime: firstSlot?.startTime || "09:00 AM",
            toTime: firstSlot?.endTime || "05:00 PM",
          },
        ],
      };
    }

    // Add new -> start with 1 empty card
    return {
      leaves: [
        {
          date: "",
          exceptionType: "FULL_DAY_LEAVE",
          fromTime: "09:00 AM",
          toTime: "05:00 PM",
        },
      ],
    };
  }, [dateItem]);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: defaults,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "leaves",
    keyName: "fieldId",
  });

  useEffect(() => {
    if (isOpen) reset(defaults);
  }, [isOpen, defaults, reset]);

  const close = () => {
    onOpenChange(false);
    reset(defaults);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const leaves = (values.leaves || [])
        .map((l) => ({
          ...l,
          date: normalizeDateOnly(l.date),
        }))
        .filter((l) => !!l.date);

      if (!leaves.length) {
        addToast({
          title: "Missing date",
          description: "Please add at least one leave date.",
          color: "warning",
        });
        return;
      }

      // ✅ Merge rule:
      // - keep existing dateAvailability as-is
      // - replace any dates that user edited/added in modal
      const existing = Array.isArray(allDateAvailability) ? allDateAvailability : [];
      const editedDateSet = new Set(leaves.map((l) => l.date));

      const kept = existing
        .map((d) => ({
          date: normalizeDateOnly(d.date),
          isAvailable: Boolean(d.isAvailable),
          slotMinutes: Number(d.slotMinutes) || 30,
          stepMinutes: Number(d.stepMinutes) || 15,
          timeSlots: Array.isArray(d.timeSlots) ? d.timeSlots : [],
          notes: d.notes ?? "",
        }))
        .filter((d) => !editedDateSet.has(d.date));

      const edited = leaves.map((l) => {
        if (l.exceptionType === "FULL_DAY_LEAVE") {
          return {
            date: l.date,
            isAvailable: false,
            notes: "Full Day Leave",
          };
        }

        // CUSTOM_WORKING_HOURS -> partial (available for only one slot range)
        return {
          date: l.date,
          isAvailable: true,
          notes: "Custom Working Hours",
          slotMinutes: 30,
          stepMinutes: 15,
          timeSlots: [
            {
              startTime: l.fromTime,
              endTime: l.toTime,
              isAvailable: true,
              notes: "",
            },
          ],
        };
      });

      const payload = {
        dateAvailability: [...kept, ...edited],
      };

      await updateDoctor(payload as any).unwrap();

      addToast({
        title: "Leaves updated",
        description: "Changes have been saved.",
        color: "success",
      });

      onSaved();
      close();
    } catch (error) {
      console.error("Update leaves failed:", error);
      // addToast({
      //   title: "Save failed",
      //   description: "Unable to save leaves. Please try again.",
      //   color: "danger",
      // });
    }
  };

  const leavesWatch = watch("leaves");

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) close();
        else onOpenChange(open);
      }}
      size="3xl"
      placement="center"
      classNames={{
        base: "max-w-[900px] max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col",
        header: "px-6 pt-5 pb-2 flex-none",
        body: "px-6 pb-4 pt-0 space-y-4 flex-1 min-h-0 overflow-y-auto",
        footer: "px-6 pb-5 pt-3 flex-none",
      }}
    >
      <ModalContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full min-h-0">
          <ModalHeader className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-slate-900">Leaves</span>
              <span className="text-xs text-slate-500">
                Add full day leave or custom working hours
              </span>
            </div>

            <Button
              size="sm"
              className="bg-emerald-600 text-white"
              startContent={<FiPlus />}
              onPress={() =>
                append({
                  date: "",
                  exceptionType: "FULL_DAY_LEAVE",
                  fromTime: "09:00 AM",
                  toTime: "05:00 PM",
                })
              }
            >
              Add Leave
            </Button>
          </ModalHeader>

          <ModalBody>
            {fields.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-[12px] text-slate-500">
                No leaves added.
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((f, idx) => {
                  const current = leavesWatch?.[idx];
                  const isFullDay = current?.exceptionType === "FULL_DAY_LEAVE";

                  return (
                    <div key={f.fieldId} className="rounded-2xl border border-slate-200 bg-white p-4">
                      {/* top row: Date header + delete */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {current?.date ? ddMon(current.date) : "Select Date"}
                          </div>

                          <div className="mt-1">
                            {isFullDay ? (
                              <span className="text-[11px] font-semibold text-rose-600">
                                FULL DAY LEAVE
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-amber-600">
                                PARTIAL LEAVE
                              </span>
                            )}
                            <span className="ml-2 text-[11px] text-slate-500">
                              {isFullDay ? "—" : `${current?.fromTime || "—"} - ${current?.toTime || "—"}`}
                            </span>
                          </div>
                        </div>

                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          className="text-rose-600"
                          onPress={() => remove(idx)}
                          aria-label="Delete leave"
                        >
                          <FiTrash2 />
                        </Button>
                      </div>

                      {/* form row */}
                      <div className="mt-4 grid gap-3 md:grid-cols-12">
                        {/* Exception Type */}
                        <div className="md:col-span-5">
                          <Controller
                            control={control}
                            name={`leaves.${idx}.exceptionType` as const}
                            render={({ field }) => (
                              <Select
                                label="Exception Type"
                                labelPlacement="outside"
                                selectedKeys={[field.value]}
                                onSelectionChange={(keys) => {
                                  const v = Array.from(keys)[0] as ExceptionType;
                                  field.onChange(v);
                                }}
                                variant="bordered"
                                size="sm"
                              >
                                <SelectItem key="FULL_DAY_LEAVE">Full Day Leave</SelectItem>
                                <SelectItem key="CUSTOM_WORKING_HOURS">Custom Working Hours</SelectItem>
                              </Select>
                            )}
                          />
                        </div>

                        {/* Date */}
                        <div className="md:col-span-7">
                          <Controller
                            control={control}
                            name={`leaves.${idx}.date` as const}
                            rules={{ required: true }}
                            render={({ field }) => (
                              <Input
                                type="date"
                                label="Date"
                                labelPlacement="outside"
                                variant="bordered"
                                size="sm"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value)}
                              />
                            )}
                          />
                        </div>

                        {/* From / To only for partial */}
                        {!isFullDay && (
                          <>
                            <div className="md:col-span-6">
                              <Controller
                                control={control}
                                name={`leaves.${idx}.fromTime` as const}
                                render={({ field }) => (
                                  <TimeInput
                                    label="From"
                                    labelPlacement="outside"
                                    variant="bordered"
                                    size="sm"
                                    granularity="minute"
                                    hourCycle={12}
                                    value={stringToTimeValue(field.value)}
                                    onChange={(v) => field.onChange(timeValueToString(v as any))}
                                  />
                                )}
                              />
                            </div>

                            <div className="md:col-span-6">
                              <Controller
                                control={control}
                                name={`leaves.${idx}.toTime` as const}
                                render={({ field }) => (
                                  <TimeInput
                                    label="To"
                                    labelPlacement="outside"
                                    variant="bordered"
                                    size="sm"
                                    granularity="minute"
                                    hourCycle={12}
                                    value={stringToTimeValue(field.value)}
                                    onChange={(v) => field.onChange(timeValueToString(v as any))}
                                  />
                                )}
                              />
                            </div>
                          </>
                        )}
                      </div>

                      {/* action buttons like screenshot */}
                      <div className="mt-4 flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="bordered"
                          className="rounded-lg border-slate-200"
                          onPress={close}
                          disabled={isLoading || isSubmitting}
                        >
                          Cancel Changes
                        </Button>

                        <Button
                          size="sm"
                          className="rounded-lg bg-emerald-600 text-white"
                          type="submit"
                          isLoading={isLoading || isSubmitting}
                        >
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ModalBody>

          {/* footer optional (you can keep empty or remove) */}
          <ModalFooter className="border-t border-slate-200">
            <div className="text-xs text-slate-500">
              Tip: Full day leave = doctor not available for that date.
            </div>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default UpdateDateOverrideModal;
