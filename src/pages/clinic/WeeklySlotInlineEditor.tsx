// src/pages/clinic/WeeklySlotInlineEditor.tsx
// import React, { useEffect, useMemo } from "react";
// import {
//   Button,
//   Input,
//   Switch,
//   Select,
//   SelectItem,
//   addToast,
// } from "@heroui/react";
// import { Controller, useFieldArray, useForm } from "react-hook-form";
// import { FiClock } from "react-icons/fi";
// import type { Selection } from "@react-types/shared";

// import { useUpdateDoctorMutation } from "../../redux/api/doctorApi";

// // ✅ Unsaved changes
// import { useUnsavedChanges } from "../../context/UnsavedChangesContext";

// /* ---------------- ✅ TYPES (moved here to fix build: no missing module) ---------------- */

// type WeekDay =
//   | "Monday"
//   | "Tuesday"
//   | "Wednesday"
//   | "Thursday"
//   | "Friday"
//   | "Saturday"
//   | "Sunday";

// export type Break = {
//   breakType?: string | null;
//   startTime: string;
//   endTime: string;
//   status?: boolean;
//   notes?: string | null;
// };

// export type DateTimeSlot = {
//   id?: string;
//   startTime: string;
//   endTime: string;
//   isAvailable: boolean;
//   notes?: string;
// };

// export type DateAvailabilityItem = {
//   id?: string;
//   date: string;
//   isAvailable: boolean;
//   notes?: string;
//   slotMinutes?: number;
//   stepMinutes?: number;
//   timeSlots: DateTimeSlot[];
// };

// export type AvailabilitySlot = {
//   id?: string;
//   date?: string;

//   dayOfWeek: WeekDay;
//   startTime: string | null;
//   endTime: string | null;

//   breaksStart?: string | null;
//   breaksEnd?: string | null;

//   isAvailable: boolean;
//   notes?: string | null;

//   slotMinutes?: number;
//   stepMinutes?: number;

//   breaks?: Break[];
//   aivblityBreak?: Break[];
//   availabilityBreak?: Break[];

//   doctorId?: string;
// };

// /* ---------------- Helpers ---------------- */

// function normalizeDateOnly(v: any): string {
//   if (!v) return "";
//   const s = String(v);
//   if (s.includes("T")) return s.slice(0, 10);
//   if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
//   return s;
// }

// function parseTimeToMinutes(t?: string | null): number | null {
//   if (!t) return null;
//   const s = String(t).trim();

//   const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
//   if (m12) {
//     let hh = Number(m12[1]);
//     const mm = Number(m12[2]);
//     const ap = m12[3].toUpperCase();
//     if (hh === 12) hh = 0;
//     if (ap === "PM") hh += 12;
//     return hh * 60 + mm;
//   }

//   const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
//   if (m24) return Number(m24[1]) * 60 + Number(m24[2]);

//   return null;
// }

// function estimateSlotsCount(
//   start?: string | null,
//   end?: string | null,
//   slotMinutes?: number,
// ) {
//   const a = parseTimeToMinutes(start);
//   const b = parseTimeToMinutes(end);
//   const sm = slotMinutes && slotMinutes > 0 ? slotMinutes : 30;
//   if (a === null || b === null) return null;
//   const diff = b - a;
//   if (diff <= 0) return null;
//   return Math.floor(diff / sm);
// }

// /* ---------------- ✅ Time dropdown helpers ---------------- */

// function formatMinutesTo12h(total: number) {
//   const h24 = Math.floor(total / 60);
//   const mm = total % 60;

//   const ap = h24 >= 12 ? "PM" : "AM";
//   let h12 = h24 % 12;
//   if (h12 === 0) h12 = 12;

//   return `${String(h12).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${ap}`;
// }

// // function normalizeTimeLabel(v?: string | null): string {
// //   const m = parseTimeToMinutes(v);
// //   if (m === null) return v ? String(v) : "";
// //   return formatMinutesTo12h(m);
// // }

// function normalizeTimeLabel(v?: string | null): string {
//   if (!v) return "";

//   // Check if it's in API format "HH:MM:SS" (e.g., "14:00:00")
//   if (typeof v === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(v)) {
//     const parts = v.split(':');
//     const hours = parseInt(parts[0], 10);
//     const minutes = parts[1];

//     // Convert to 12-hour format
//     const ampm = hours >= 12 ? 'PM' : 'AM';
//     const hour12 = hours % 12 || 12;
//     return `${hour12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
//   }

//   // For all other formats, use existing logic
//   const m = parseTimeToMinutes(v);
//   if (m === null) return String(v);
//   return formatMinutesTo12h(m);
// }

// // ✅ keep 15 for more options, change to 30 if you want less
// const TIME_STEP_MINUTES = 15;

// const TIME_OPTIONS: string[] = (() => {
//   const out: string[] = [];
//   for (let m = 0; m < 24 * 60; m += TIME_STEP_MINUTES) {
//     out.push(formatMinutesTo12h(m));
//   }
//   return out;
// })();

// /* ---------------- Types ---------------- */

// type FormValues = {
//   dayOfWeek: string;
//   startTime: string;
//   endTime: string;
//   isAvailable: boolean;
//   notes?: string;
//   slotMinutes: number | string; // appointment preference
//   stepMinutes: number | string; // buffer time
//   breaks: Break[];
// };

// type Props = {
//   slot: AvailabilitySlot;
//   allAvailability: AvailabilitySlot[];
//   allDateAvailability: DateAvailabilityItem[];
//   onSaved: () => void;
//   onCancel: () => void;
//   hideHeader?: boolean;
// };

// /* ---------------- UI bits ---------------- */

// const TimeSelectField = ({
//   label,
//   placeholder,
//   value,
//   onChange,
// }: {
//   label: string;
//   placeholder?: string;
//   value?: string;
//   onChange: (v: string) => void;
// }) => {
//   const normalized = normalizeTimeLabel(value);

//   // ✅ Iterable<string> (safe for HeroUI Key type)
//   const selectedKeys = normalized ? [normalized] : undefined;

//   return (
//     <Select
//       label={label}
//       labelPlacement="outside"
//       placeholder={placeholder}
//       variant="bordered"
//       size="sm"
//       selectedKeys={selectedKeys}
//       onSelectionChange={(keys: Selection) => {
//         if (keys === "all") return; // safety
//         const first = Array.from(keys)[0];
//         onChange(first ? String(first) : "");
//       }}
//       classNames={{
//         trigger: "h-11 rounded-full bg-white border-slate-200 shadow-none",
//         label: "text-xs font-medium text-slate-600",
//       }}
//     >
//       {TIME_OPTIONS.map((t) => (
//         <SelectItem key={t} textValue={t}>
//           {t}
//         </SelectItem>
//       ))}
//     </Select>
//   );
// };

// const SegBtn = ({
//   active,
//   children,
//   onClick,
// }: {
//   active?: boolean;
//   children: React.ReactNode;
//   onClick: () => void;
// }) => (
//   <button
//     type="button"
//     onClick={onClick}
//     className={`rounded-full px-4 py-2 text-xs font-semibold transition ${active
//         ? "bg-emerald-700 text-white shadow-sm"
//         : "text-slate-600 hover:bg-slate-100"
//       }`}
//   >
//     {children}
//   </button>
// );

// /* ---------------- Defaults ---------------- */

// function getDefaultValues(slot: AvailabilitySlot): FormValues {
//   const baseBreaks = (slot as any)?.aivblityBreak?.length
//     ? (slot as any).aivblityBreak
//     : (slot as any)?.availabilityBreak?.length
//       ? (slot as any).availabilityBreak
//       : (slot as any)?.breaks || [];

//   const normalizedBreaks: Break[] = (baseBreaks || []).map((b: any) => ({
//     ...b,
//     startTime: normalizeTimeLabel(b.startTime),
//     endTime: normalizeTimeLabel(b.endTime),
//   }));

//   const finalBreaks =
//     normalizedBreaks.length > 0
//       ? normalizedBreaks
//       : [
//         {
//           breakType: "GAP",
//           startTime: "",
//           endTime: "",
//           status: true,
//           notes: "",
//         },
//       ];

//   return {
//     dayOfWeek: (slot as any)?.dayOfWeek ?? "",
//     startTime: normalizeTimeLabel((slot as any)?.startTime ?? ""),
//     endTime: normalizeTimeLabel((slot as any)?.endTime ?? ""),
//     isAvailable:
//       typeof (slot as any)?.isAvailable === "boolean"
//         ? (slot as any).isAvailable
//         : true,
//     notes: (slot as any)?.notes ?? "",
//     slotMinutes: (slot as any)?.slotMinutes ?? 30,
//     stepMinutes: (slot as any)?.stepMinutes ?? 15,
//     breaks: finalBreaks,
//   };
// }

// /* ---------------- Component ---------------- */

// const WeeklySlotInlineEditor: React.FC<Props> = ({
//   slot,
//   allAvailability,
//   allDateAvailability,
//   onSaved,
//   onCancel,
//   hideHeader = false,
// }) => {
//   const [updateDoctor, { isLoading }] = useUpdateDoctorMutation();

//   // ✅ global dirty setter
//   const { setDirty } = useUnsavedChanges();

//   const defaults = useMemo(() => getDefaultValues(slot), [slot]);

//   const {
//     register,
//     control,
//     handleSubmit,
//     reset,
//     watch,
//     setValue,
//     formState: { isSubmitting, isDirty },
//   } = useForm<FormValues>({ defaultValues: defaults });

//   // ✅ sync unsaved changes with RHF dirty
//   useEffect(() => {
//     setDirty(Boolean(isDirty));
//   }, [isDirty, setDirty]);

//   // ✅ if editor closes/unmounts, don't keep stale dirty state
//   useEffect(() => {
//     return () => setDirty(false);
//   }, [setDirty]);

//   const { fields } = useFieldArray({
//     control,
//     name: "breaks",
//   });

//   useEffect(() => {
//     reset(defaults);
//     setDirty(false); // ✅ fresh defaults => not dirty
//   }, [defaults, reset, setDirty]);

//   const wStart = watch("startTime");
//   const wEnd = watch("endTime");
//   const wSlotMinutesRaw = watch("slotMinutes");
//   const wSlotMinutes =
//     Number(wSlotMinutesRaw) > 0 ? Number(wSlotMinutesRaw) : 30;

//   const slotsCount = estimateSlotsCount(wStart, wEnd, wSlotMinutes);

//   const onSubmitForm = async (values: FormValues) => {
//     try {
//       const dayOfWeek = values.dayOfWeek || slot?.dayOfWeek || "";
//       if (!dayOfWeek) {
//         addToast({
//           title: "Missing day",
//           description: "Day is missing in form values.",
//           color: "warning",
//         });
//         return;
//       }

//       const slotMinutes =
//         Number(values.slotMinutes) > 0 ? Number(values.slotMinutes) : 30;
//       // const stepMinutes =
//       //   Number(values.stepMinutes) > 0 ? Number(values.stepMinutes) : 15;

//       const stepMinutes = Number(values.stepMinutes) || 0;

//       const normalizedBreaks: Break[] = (values.breaks || []).map((b) => ({
//         breakType: b.breakType || null,
//         startTime: b.startTime,
//         endTime: b.endTime,
//         status: typeof b.status === "boolean" ? b.status : true,
//         notes: b.notes ?? null,
//       }));

//       const nextAvailability: AvailabilitySlot[] = (allAvailability || []).map(
//         (a) => {
//           const match =
//             (slot?.id && a.id === slot.id) ||
//             (!slot?.id && a.dayOfWeek === slot?.dayOfWeek);
//           if (!match) return a;

//           return {
//             ...a,
//             dayOfWeek: dayOfWeek as WeekDay,
//             startTime: values.startTime,
//             endTime: values.endTime,
//             isAvailable: values.isAvailable,
//             notes: values.notes ?? "",
//             slotMinutes,
//             stepMinutes,
//             breaks: normalizedBreaks,
//             availabilityBreak: normalizedBreaks,
//             aivblityBreak: normalizedBreaks,
//           };
//         },
//       );

//       // ✅ Keep backend dateAvailability same (as-is)
//       const existingDateAvailability: DateAvailabilityItem[] = (
//         Array.isArray(allDateAvailability) ? allDateAvailability : []
//       ).map((d: any) => ({
//         date: normalizeDateOnly(d.date),
//         isAvailable: Boolean(d.isAvailable),
//         notes: d.notes ?? "",
//         slotMinutes: d.slotMinutes ?? slotMinutes,
//         stepMinutes: d.stepMinutes ?? stepMinutes,
//         timeSlots: Array.isArray(d.timeSlots)
//           ? d.timeSlots.map((t: any) => ({
//             startTime: t.startTime ?? "",
//             endTime: t.endTime ?? "",
//             isAvailable:
//               typeof t.isAvailable === "boolean" ? t.isAvailable : true,
//             notes: t.notes ?? "",
//           }))
//           : [],
//       }));

//       const payload = {
//         aivblity: nextAvailability.map((a) => {
//           const bArr: Break[] = (a as any)?.aivblityBreak?.length
//             ? (a as any).aivblityBreak
//             : (a as any)?.availabilityBreak?.length
//               ? (a as any).availabilityBreak
//               : (a as any)?.breaks || [];

//           return {
//             dayOfWeek: a.dayOfWeek,
//             startTime: a.startTime,
//             endTime: a.endTime,
//             isAvailable: (a as any).isAvailable,
//             notes: (a as any).notes ?? "",
//             slotMinutes:
//               typeof (a as any).slotMinutes === "number"
//                 ? (a as any).slotMinutes
//                 : slotMinutes,
//             stepMinutes:
//               typeof (a as any).stepMinutes === "number"
//                 ? (a as any).stepMinutes
//                 : stepMinutes,
//             aivblityBreak: (bArr || []).map((b) => ({
//               breakType: b.breakType || "Break",
//               startTime: b.startTime,
//               endTime: b.endTime,
//               status: typeof b.status === "boolean" ? b.status : true,
//               notes: b.notes ?? "",
//             })),
//           };
//         }),

//         dateAvailability: existingDateAvailability.map((d) => ({
//           date: d.date,
//           isAvailable: d.isAvailable,
//           notes: d.notes ?? "",
//           ...(d.isAvailable
//             ? {
//               slotMinutes: Number(d.slotMinutes) || slotMinutes,
//               stepMinutes: Number(d.stepMinutes) || stepMinutes,
//               timeSlots: (d.timeSlots || []).map((ts) => ({
//                 startTime: ts.startTime,
//                 endTime: ts.endTime,
//                 isAvailable: ts.isAvailable,
//                 notes: ts.notes ?? "",
//               })),
//             }
//             : {}),
//         })),
//       } as const;

//       await updateDoctor(payload as any).unwrap();

//       addToast({
//         title: "Availability updated",
//         description: "Changes have been saved.",
//         color: "success",
//       });

//       // ✅ saved => allow navigation without prompt
//       setDirty(false);

//       onSaved();
//       onCancel();
//     } catch (error) {
//       console.error("Update doctor availability failed:", error);
//       addToast({
//         title: "Save failed",
//         description: "Unable to save availability. Please try again.",
//         color: "danger",
//       });
//     }
//   };

//   const handleCancel = () => {
//     // ✅ user intentionally discards inline edits
//     setDirty(false);
//     onCancel();
//   };

//   return (
//     <form onSubmit={handleSubmit(onSubmitForm)} className="rounded-2xl bg-white">
//       {!hideHeader && (
//         <>
//           {/* Expanded Header (inside card) */}
//           <div className="flex items-center justify-between gap-3 px-4 py-3">
//             <div className="min-w-0">
//               <div className="text-sm font-semibold text-slate-900">
//                 {slot.dayOfWeek}
//               </div>
//               <div className="text-xs text-emerald-700">
//                 {wStart || "—"} - {wEnd || "—"}
//                 {slotsCount !== null ? ` (${slotsCount} slots)` : ""}
//               </div>
//             </div>

//             <Controller
//               control={control}
//               name="isAvailable"
//               render={({ field }) => (
//                 <Switch
//                   size="sm"
//                   isSelected={!!field.value}
//                   onValueChange={field.onChange}
//                   aria-label="Day availability"
//                 />
//               )}
//             />
//           </div>

//           {/* Divider */}
//           <div className="h-px w-full bg-slate-200" />
//         </>
//       )}

//       <div className="px-4 py-4 space-y-4">
//         {/* Daily Time Window */}
//         <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
//           <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
//             <span className="grid h-8 w-8 place-items-center rounded-xl bg-white border border-slate-200 text-slate-600">
//               🕒
//             </span>
//             Daily Time Window
//           </div>

//           <div className="grid gap-3 md:grid-cols-12 md:items-end">
//             <div className="md:col-span-5">
//               <Controller
//                 control={control}
//                 name="startTime"
//                 rules={{ required: true }}
//                 render={({ field }) => (
//                   <TimeSelectField
//                     label="From"
//                     placeholder="09:00 AM"
//                     value={field.value}
//                     onChange={(v) =>
//                       setValue("startTime", v, {
//                         shouldDirty: true,
//                         shouldValidate: true,
//                       })
//                     }
//                   />
//                 )}
//               />
//             </div>

//             <div className="hidden md:col-span-2 md:flex md:justify-center">
//               <div className="mt-6 grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-700">
//                 <span className="text-lg">→</span>
//               </div>
//             </div>

//             <div className="md:col-span-5">
//               <Controller
//                 control={control}
//                 name="endTime"
//                 rules={{ required: true }}
//                 render={({ field }) => (
//                   <TimeSelectField
//                     label="To"
//                     placeholder="06:00 PM"
//                     value={field.value}
//                     onChange={(v) =>
//                       setValue("endTime", v, {
//                         shouldDirty: true,
//                         shouldValidate: true,
//                       })
//                     }
//                   />
//                 )}
//               />
//             </div>
//           </div>
//         </div>

//         {/* Breaks list */}
//         {fields.length > 0 && (
//           <div className="space-y-3">
//             {fields.map((f, index) => {
//               // const title = wBreaks?.[index]?.breakType || "Lunch Break";
//               return (
//                 <div
//                   key={f.id}
//                   className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
//                 >
//                   <div className="mb-3 flex items-center justify-between">
//                     <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
//                       <span className="grid h-8 w-8 place-items-center rounded-xl bg-white border border-slate-200 text-slate-600">
//                         <FiClock />
//                       </span>
//                       Add Gap Between Second Shift (If Second Shift Exists)
//                     </div>

//                     <div className="flex items-center gap-2">
//                       <Controller
//                         control={control}
//                         name={`breaks.${index}.status` as const}
//                         render={({ field }) => (
//                           <Switch
//                             size="sm"
//                             isSelected={!!field.value}
//                             onValueChange={field.onChange}
//                             aria-label="Break status"
//                           />
//                         )}
//                       />
//                       {/* <Button
//                         isIconOnly
//                         size="sm"
//                         variant="light"
//                         className="text-slate-500 hover:text-rose-600"
//                         onPress={() => remove(index)}
//                         aria-label="Remove break"
//                         title="Remove break"
//                       >
//                         <FiX />
//                       </Button> */}
//                     </div>
//                   </div>

//                   <div className="grid gap-3 md:grid-cols-12 md:items-end">
//                     <div className="md:col-span-5">
//                       <Controller
//                         control={control}
//                         name={`breaks.${index}.startTime` as const}
//                         rules={{ required: true }}
//                         render={({ field }) => (
//                           <TimeSelectField
//                             label="From"
//                             placeholder="01:00 PM"
//                             value={field.value}
//                             onChange={(v) =>
//                               setValue(`breaks.${index}.startTime` as any, v, {
//                                 shouldDirty: true,
//                                 shouldValidate: true,
//                               })
//                             }
//                           />
//                         )}
//                       />
//                     </div>

//                     <div className="hidden md:col-span-2 md:flex md:justify-center">
//                       <div className="mt-6 grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-700">
//                         <span className="text-lg">→</span>
//                       </div>
//                     </div>

//                     <div className="md:col-span-5">
//                       <Controller
//                         control={control}
//                         name={`breaks.${index}.endTime` as const}
//                         rules={{ required: true }}
//                         render={({ field }) => (
//                           <TimeSelectField
//                             label="To"
//                             placeholder="02:00 PM"
//                             value={field.value}
//                             onChange={(v) =>
//                               setValue(`breaks.${index}.endTime` as any, v, {
//                                 shouldDirty: true,
//                                 shouldValidate: true,
//                               })
//                             }
//                           />
//                         )}
//                       />
//                     </div>
//                   </div>

//                   {/* Break name */}
//                   {/* <div className="mt-3">
//                     <Input
//                       size="sm"
//                       variant="bordered"
//                       label="Break name"
//                       labelPlacement="outside"
//                       placeholder="Lunch Break"
//                       classNames={{
//                         inputWrapper:
//                           "h-11 rounded-full bg-white border-slate-200",
//                         label: "text-xs font-medium text-slate-600",
//                       }}
//                       {...register(`breaks.${index}.breakType` as const)}
//                     />
//                   </div> */}
//                 </div>
//               );
//             })}
//           </div>
//         )}

//         {/* Add New Break */}
//         {/* <button
//           type="button"
//           onClick={() =>
//             append({
//               breakType: "Lunch Break",
//               startTime: "",
//               endTime: "",
//               status: true,
//               notes: "",
//             })
//           }
//           className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
//         >
//           <span>+</span> Add New Break
//         </button> */}

//         <div className="h-px w-full bg-slate-200" />

//         {/* Preferences */}
//         <div className="grid gap-4 md:grid-cols-12">
//           {/* slotMinutes */}
//           <div className="md:col-span-4">
//             <div className="text-xs font-semibold text-slate-700">
//               Appointment Preferences
//             </div>
//             <div className="mt-2 inline-flex rounded-full bg-slate-100 p-1">
//               {[15, 20, 30].map((m) => (
//                 <SegBtn
//                   key={m}
//                   active={Number(wSlotMinutes) === m}
//                   onClick={() =>
//                     setValue("slotMinutes", m, {
//                       shouldDirty: true,
//                       shouldValidate: true,
//                     })
//                   }
//                 >
//                   {m}min
//                 </SegBtn>
//               ))}
//             </div>
//             <input type="hidden" {...register("slotMinutes")} />
//           </div>

//           {/* buffer -> stepMinutes */}
//           <div className="md:col-span-4">
//             <Input
//               type="number"
//               min={0}
//               label="Buffer time"
//               labelPlacement="outside"
//               placeholder="10"
//               variant="bordered"
//               size="sm"
//               classNames={{
//                 inputWrapper: "h-11 rounded-full bg-white border-slate-200",
//                 label: "text-xs font-semibold text-slate-700",
//               }}
//               {...register("stepMinutes", { required: true })}
//             />
//           </div>

//           {/* UI-only */}
//           {/* <div className="md:col-span-4">
//             <SelectLikeInput
//               label="Max patients/day"
//               labelPlacement="outside"
//               value="No limit"
//               isReadOnly
//             />
//           </div> */}
//         </div>

//         {/* Footer buttons */}
//         <div className="flex items-center justify-end gap-3 pt-2">
//           <Button
//             type="button"
//             variant="bordered"
//             onPress={handleCancel}
//             disabled={isLoading || isSubmitting}
//             className="rounded-full border-emerald-600 text-emerald-700"
//           >
//             Cancel Changes
//           </Button>

//           <Button
//             type="submit"
//             className="rounded-full bg-emerald-700 text-white hover:bg-emerald-800"
//             isLoading={isLoading || isSubmitting}
//           >
//             Save Changes
//           </Button>
//         </div>

//         {/* keep notes registered (but hidden) */}
//         <div className="hidden">
//           <Input {...register("notes")} />
//         </div>
//       </div>
//     </form>
//   );
// };

// export default WeeklySlotInlineEditor;

// src/pages/clinic/WeeklySlotInlineEditor.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Input,
  Switch,
  Select,
  SelectItem,
  addToast,
} from "@heroui/react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { FiClock, FiPlus, FiTrash2 } from "react-icons/fi";

import { useUpdateDoctorMutation } from "../../redux/api/doctorApi";
import { useUnsavedChanges } from "../../context/UnsavedChangesContext";

/* ---------------- ✅ TYPES ---------------- */

type WeekDay =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export type Break = {
  breakType?: string | null;
  startTime: string;
  endTime: string;
  status?: boolean;
  notes?: string | null;
};

export type DateTimeSlot = {
  id?: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  notes?: string;
};

export type DateAvailabilityItem = {
  id?: string;
  date: string;
  isAvailable: boolean;
  notes?: string;
  slotMinutes?: number;
  stepMinutes?: number;
  timeSlots: DateTimeSlot[];
};

export type AvailabilitySlot = {
  id?: string;
  date?: string;

  dayOfWeek: WeekDay;
  startTime: string | null;
  endTime: string | null;

  breaksStart?: string | null;
  breaksEnd?: string | null;

  isAvailable: boolean;
  notes?: string | null;

  slotMinutes?: number;
  stepMinutes?: number;

  noOfPatients?: number | null;

  breaks?: Break[];
  aivblityBreak?: Break[];
  availabilityBreak?: Break[];

  doctorId?: string;
};

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

  const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let hh = Number(m12[1]);
    const mm = Number(m12[2]);
    const ap = m12[3].toUpperCase();
    if (hh === 12) hh = 0;
    if (ap === "PM") hh += 12;
    return hh * 60 + mm;
  }

  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) return Number(m24[1]) * 60 + Number(m24[2]);

  return null;
}

function formatMinutesTo12h(total: number) {
  const MINUTES_IN_DAY = 24 * 60;
  const normalizedTotal =
    ((total % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;

  const h24 = Math.floor(normalizedTotal / 60);
  const mm = normalizedTotal % 60;

  const ap = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;

  return `${String(h12).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${ap}`;
}

function normalizeTimeLabel(v?: string | null): string {
  if (!v) return "";

  if (typeof v === "string" && /^\d{2}:\d{2}:\d{2}$/.test(v)) {
    const parts = v.split(":");
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${hour12.toString().padStart(2, "0")}:${minutes} ${ampm}`;
  }

  const m = parseTimeToMinutes(v);
  if (m === null) return String(v);
  return formatMinutesTo12h(m);
}

const TIME_STEP_MINUTES = 15;

function splitTimeParts(v?: string | null): {
  hour: string;
  minute: string;
  period: string;
} {
  const normalized = normalizeTimeLabel(v);
  const match = normalized.match(/^(\d{2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    return { hour: "", minute: "", period: "" };
  }

  return {
    hour: match[1],
    minute: match[2],
    period: match[3].toUpperCase(),
  };
}

function buildTimeFromParts(
  hour?: string,
  minute?: string,
  period?: string,
): string {
  if (!hour || !minute || !period) return "";
  return `${hour}:${minute} ${period}`;
}

const ALL_TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += TIME_STEP_MINUTES) {
    out.push(formatMinutesTo12h(m));
  }
  return out;
})();

type TimeOptionPart = {
  full: string;
  hour: string;
  minute: string;
  period: string;
};

function uniqueValues(values: string[]) {
  return Array.from(new Set(values));
}

function getAllowedTimeParts(
  minTime?: string,
  maxTime?: string,
): TimeOptionPart[] {
  const minMinutes = parseTimeToMinutes(minTime);
  const maxMinutes = parseTimeToMinutes(maxTime);

  return ALL_TIME_OPTIONS.filter((time) => {
    const minutes = parseTimeToMinutes(time);
    if (minutes === null) return false;

    if (minMinutes !== null && minutes <= minMinutes) return false;
    if (maxMinutes !== null && minutes >= maxMinutes) return false;

    return true;
  }).map((time) => {
    const parts = splitTimeParts(time);
    return {
      full: time,
      hour: parts.hour,
      minute: parts.minute,
      period: parts.period,
    };
  });
}

// function getFirstAllowedTime(minTime?: string, maxTime?: string): string {
//   const first = getAllowedTimeParts(minTime, maxTime)[0];
//   return first?.full || "";
// }

function getFirstMatchingAllowedTime(
  allowedTimeParts: TimeOptionPart[],
  preferred: {
    hour?: string;
    minute?: string;
    period?: string;
  },
): string {
  const exactMatch = allowedTimeParts.find(
    (item) =>
      (!preferred.hour || item.hour === preferred.hour) &&
      (!preferred.minute || item.minute === preferred.minute) &&
      (!preferred.period || item.period === preferred.period),
  );

  if (exactMatch) return exactMatch.full;

  const hourMinuteMatch = allowedTimeParts.find(
    (item) =>
      (!preferred.hour || item.hour === preferred.hour) &&
      (!preferred.minute || item.minute === preferred.minute),
  );

  if (hourMinuteMatch) return hourMinuteMatch.full;

  const hourMatch = allowedTimeParts.find(
    (item) => !preferred.hour || item.hour === preferred.hour,
  );

  if (hourMatch) return hourMatch.full;

  return allowedTimeParts[0]?.full || "";
}

const TimeSelectField = ({
  label,
  value,
  onChange,
  isDisabled = false,
  minTime,
  maxTime,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  isDisabled?: boolean;
  minTime?: string;
  maxTime?: string;
}) => {
  const parsedValue = useMemo(() => splitTimeParts(value), [value]);

  const [hour, setHour] = useState(parsedValue.hour);
  const [minute, setMinute] = useState(parsedValue.minute);
  const [period, setPeriod] = useState(parsedValue.period);

  useEffect(() => {
    setHour(parsedValue.hour);
    setMinute(parsedValue.minute);
    setPeriod(parsedValue.period);
  }, [parsedValue.hour, parsedValue.minute, parsedValue.period]);

  const allowedTimeParts = useMemo(
    () => getAllowedTimeParts(minTime, maxTime),
    [minTime, maxTime],
  );

  const availableHours = useMemo(() => {
    return uniqueValues(allowedTimeParts.map((item) => item.hour));
  }, [allowedTimeParts]);

  const availableMinutes = useMemo(() => {
    return uniqueValues(
      allowedTimeParts
        .filter((item) => !hour || item.hour === hour)
        .map((item) => item.minute),
    );
  }, [allowedTimeParts, hour]);

  const availablePeriods = useMemo(() => {
    return uniqueValues(
      allowedTimeParts
        .filter(
          (item) =>
            (!hour || item.hour === hour) &&
            (!minute || item.minute === minute),
        )
        .map((item) => item.period),
    );
  }, [allowedTimeParts, hour, minute]);

  useEffect(() => {
    const currentFullValue = buildTimeFromParts(hour, minute, period);
    const isCurrentValueValid =
      !!currentFullValue &&
      allowedTimeParts.some((item) => item.full === currentFullValue);

    if (!isCurrentValueValid && allowedTimeParts.length > 0) {
      const fallback = allowedTimeParts[0];
      setHour(fallback.hour);
      setMinute(fallback.minute);
      setPeriod(fallback.period);

      if (fallback.full !== value) {
        onChange(fallback.full);
      }
    }
  }, [hour, minute, period, value, allowedTimeParts, onChange]);

  useEffect(() => {
    if (hour && !availableHours.includes(hour)) setHour("");
  }, [hour, availableHours]);

  useEffect(() => {
    if (minute && !availableMinutes.includes(minute)) setMinute("");
  }, [minute, availableMinutes]);

  useEffect(() => {
    if (period && !availablePeriods.includes(period)) setPeriod("");
  }, [period, availablePeriods]);

  const updateParts = (
    nextHour: string,
    nextMinute: string,
    nextPeriod: string,
  ) => {
    const nextTime = buildTimeFromParts(nextHour, nextMinute, nextPeriod);

    if (nextTime && allowedTimeParts.some((item) => item.full === nextTime)) {
      setHour(nextHour);
      setMinute(nextMinute);
      setPeriod(nextPeriod);
      onChange(nextTime);
      return;
    }

    const fallbackTime = getFirstMatchingAllowedTime(allowedTimeParts, {
      hour: nextHour || undefined,
      minute: nextMinute || undefined,
      period: nextPeriod || undefined,
    });

    if (!fallbackTime) {
      setHour(nextHour);
      setMinute(nextMinute);
      setPeriod(nextPeriod);
      return;
    }

    const fallbackParts = splitTimeParts(fallbackTime);

    setHour(fallbackParts.hour);
    setMinute(fallbackParts.minute);
    setPeriod(fallbackParts.period);
    onChange(fallbackTime);
  };

  const selectedHourKeys =
    hour && availableHours.includes(hour) ? [hour] : undefined;

  const selectedMinuteKeys =
    minute && availableMinutes.includes(minute) ? [minute] : undefined;

  const selectedPeriodKeys =
    period && availablePeriods.includes(period) ? [period] : undefined;

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-slate-600">{label}</div>

      <div className="grid grid-cols-[minmax(64px,1fr)_minmax(64px,1fr)_minmax(72px,1fr)] gap-1.5 sm:gap-2 md:max-w-[300px]">
        <Select
          aria-label={`${label} hour`}
          placeholder="Hour"
          variant="bordered"
          size="sm"
          isDisabled={isDisabled}
          selectedKeys={selectedHourKeys}
          onSelectionChange={(keys) => {
            if (keys === "all") return;
            const first = Array.from(keys)[0];
            updateParts(first ? String(first) : "", minute, period);
          }}
          className="min-w-0 w-full"
          classNames={{
            trigger: "h-11 rounded-full bg-white border-slate-200 shadow-none",
            value: "text-sm",
          }}
        >
          {availableHours.map((h) => (
            <SelectItem key={h} textValue={h}>
              {h}
            </SelectItem>
          ))}
        </Select>

        <Select
          aria-label={`${label} minute`}
          placeholder="Min"
          variant="bordered"
          size="sm"
          isDisabled={isDisabled}
          selectedKeys={selectedMinuteKeys}
          onSelectionChange={(keys) => {
            if (keys === "all") return;
            const first = Array.from(keys)[0];
            updateParts(hour, first ? String(first) : "", period);
          }}
          className="min-w-0 w-full"
          classNames={{
            trigger: "h-11 rounded-full bg-white border-slate-200 shadow-none",
            value: "text-sm",
          }}
        >
          {availableMinutes.map((m) => (
            <SelectItem key={m} textValue={m}>
              {m}
            </SelectItem>
          ))}
        </Select>

        <Select
          aria-label={`${label} period`}
          placeholder="AM/PM"
          variant="bordered"
          size="sm"
          isDisabled={isDisabled}
          selectedKeys={selectedPeriodKeys}
          onSelectionChange={(keys) => {
            if (keys === "all") return;
            const first = Array.from(keys)[0];
            updateParts(hour, minute, first ? String(first) : "");
          }}
          className="min-w-0 w-full"
          classNames={{
            trigger: "h-11 rounded-full bg-white border-slate-200 shadow-none",
            value: "text-sm",
          }}
        >
          {availablePeriods.map((item) => (
            <SelectItem key={item} textValue={item}>
              {item}
            </SelectItem>
          ))}
        </Select>
      </div>
    </div>
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
    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
      active
        ? "bg-primary text-white shadow-sm"
        : "text-slate-600 hover:bg-slate-100"
    }`}
  >
    {children}
  </button>
);

/* ---------------- Types ---------------- */

type Shift = {
  startTime: string;
  endTime: string;
};

type FormValues = {
  dayOfWeek: string;
  shifts: Shift[];
  isAvailable: boolean;
  notes?: string;
  slotMinutes: number | string;
  stepMinutes: number | string;
};

/* ---------------- Helper Functions ---------------- */

// Convert breaks to shifts
function breaksToShifts(
  startTime: string,
  endTime: string,
  breaks: Break[],
): Shift[] {
  if (!startTime || !endTime) return [];

  const shifts: Shift[] = [];
  let currentStart = startTime;

  const sortedBreaks = [...breaks].sort((a, b) => {
    const aStart = parseTimeToMinutes(a.startTime) || 0;
    const bStart = parseTimeToMinutes(b.startTime) || 0;
    return aStart - bStart;
  });

  for (const breakItem of sortedBreaks) {
    if (breakItem.startTime && breakItem.endTime) {
      shifts.push({
        startTime: currentStart,
        endTime: breakItem.startTime,
      });
      currentStart = breakItem.endTime;
    }
  }

  shifts.push({
    startTime: currentStart,
    endTime: endTime,
  });

  return shifts.filter((shift) => {
    const startMin = parseTimeToMinutes(shift.startTime);
    const endMin = parseTimeToMinutes(shift.endTime);
    return startMin !== null && endMin !== null && endMin > startMin;
  });
}

// Convert shifts to breaks
function shiftsToBreaks(shifts: Shift[]): Break[] {
  if (shifts.length <= 1) return [];

  const breaks: Break[] = [];
  for (let i = 0; i < shifts.length - 1; i++) {
    breaks.push({
      breakType: `GAP${i + 1}`,
      startTime: shifts[i].endTime,
      endTime: shifts[i + 1].startTime,
      status: true,
      notes: null,
    });
  }
  return breaks;
}

// Validate shifts
const validateShifts = (shiftsList: Shift[]): string | null => {
  for (let i = 0; i < shiftsList.length; i++) {
    const start = parseTimeToMinutes(shiftsList[i].startTime);
    const end = parseTimeToMinutes(shiftsList[i].endTime);

    if (start === null || end === null) {
      return `Shift ${i + 1}: Invalid time format`;
    }
    if (end <= start) {
      return `Shift ${i + 1}: End time must be after start time`;
    }

    if (i > 0) {
      const prevEnd = parseTimeToMinutes(shiftsList[i - 1].endTime);
      if (prevEnd !== null && start <= prevEnd) {
        return `Shift ${i + 1}: Start time must be after previous shift's end time (${shiftsList[i - 1].endTime})`;
      }
    }
  }
  return null;
};

function getDefaultShifts(slot: AvailabilitySlot): Shift[] {
  const breaks = (slot as any)?.aivblityBreak?.length
    ? (slot as any).aivblityBreak
    : (slot as any)?.availabilityBreak?.length
      ? (slot as any).availabilityBreak
      : (slot as any)?.breaks || [];

  const shifts = breaksToShifts(
    slot.startTime || "09:00 AM",
    slot.endTime || "05:00 PM",
    breaks,
  );

  return shifts.length > 0
    ? shifts
    : [{ startTime: slot.startTime || "09:00 AM", endTime: slot.endTime || "05:00 PM" }];
}

function getDefaultValues(slot: AvailabilitySlot): FormValues {
  return {
    dayOfWeek: (slot as any)?.dayOfWeek ?? "",
    shifts: getDefaultShifts(slot),
    isAvailable:
      typeof (slot as any)?.isAvailable === "boolean"
        ? (slot as any).isAvailable
        : true,
    notes: (slot as any)?.notes ?? "",
    slotMinutes: (slot as any)?.slotMinutes ?? 30,
    stepMinutes: (slot as any)?.stepMinutes ?? 15,
  };
}

/* ---------------- Component ---------------- */

type Props = {
  slot: AvailabilitySlot;
  allAvailability: AvailabilitySlot[];
  allDateAvailability: DateAvailabilityItem[];
  onSaved: () => void;
  onCancel: () => void;
  hideHeader?: boolean;
};

const WeeklySlotInlineEditor: React.FC<Props> = ({
  slot,
  allAvailability,
  allDateAvailability,
  onSaved,
  onCancel,
  hideHeader = false,
}) => {
  const [updateDoctor, { isLoading }] = useUpdateDoctorMutation();
  const { setDirty } = useUnsavedChanges();

  const defaults = useMemo(() => getDefaultValues(slot), [slot]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting, isDirty },
  } = useForm<FormValues>({ defaultValues: defaults });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "shifts",
  });

  useEffect(() => {
    setDirty(Boolean(isDirty));
  }, [isDirty, setDirty]);

  useEffect(() => {
    return () => setDirty(false);
  }, [setDirty]);

  useEffect(() => {
    reset(defaults);
    setDirty(false);
  }, [defaults, reset, setDirty]);

  const wSlotMinutesRaw = watch("slotMinutes");
  const wSlotMinutes = Number(wSlotMinutesRaw) > 0 ? Number(wSlotMinutesRaw) : 30;
  const shifts = watch("shifts") || [];

  // Calculate total slots count across all shifts
  const totalSlotsCount = useMemo(() => {
    let total = 0;
    for (const shift of shifts) {
      const start = parseTimeToMinutes(shift.startTime);
      const end = parseTimeToMinutes(shift.endTime);
      if (start !== null && end !== null && wSlotMinutes > 0) {
        total += Math.floor((end - start) / wSlotMinutes);
      }
    }
    return total;
  }, [shifts, wSlotMinutes]);

  const addNewShift = () => {
    const currentShifts = watch("shifts") || [];
    const lastShift = currentShifts[currentShifts.length - 1];

    const lastEndMinutes = parseTimeToMinutes(lastShift?.endTime);

    if (lastEndMinutes === null) {
      addToast({
        title: "Invalid last shift",
        description: "Please set the last shift end time correctly first.",
        color: "warning",
      });
      return;
    }

    const GAP_MINUTES = 15;
    const DEFAULT_SHIFT_DURATION = 60;
    const MINUTES_IN_DAY = 24 * 60;

    const nextStartMinutes = lastEndMinutes + GAP_MINUTES;
    const nextEndMinutes = nextStartMinutes + DEFAULT_SHIFT_DURATION;

    if (nextStartMinutes >= MINUTES_IN_DAY || nextEndMinutes > MINUTES_IN_DAY) {
      addToast({
        title: "Cannot add more shifts",
        description: "No valid time left in the same day for another shift.",
        color: "warning",
      });
      return;
    }

    append({
      startTime: formatMinutesTo12h(nextStartMinutes),
      endTime: formatMinutesTo12h(nextEndMinutes),
    });
  };

  const removeShift = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const isShiftTimeIncomplete = shifts.some(
    (shift) => !shift?.startTime?.trim() || !shift?.endTime?.trim(),
  );

  const onSubmitForm = async (values: FormValues) => {
    try {
      const shiftError = validateShifts(values.shifts);
      if (shiftError) {
        addToast({
          title: "Invalid shifts",
          description: shiftError,
          color: "warning",
        });
        return;
      }

      const dayOfWeek = values.dayOfWeek || slot?.dayOfWeek || "";
      if (!dayOfWeek) {
        addToast({
          title: "Missing day",
          description: "Day is missing in form values.",
          color: "warning",
        });
        return;
      }

      const slotMinutes = Number(values.slotMinutes) > 0 ? Number(values.slotMinutes) : 30;
      const stepMinutes = Number(values.stepMinutes) || 0;

      const breaks = shiftsToBreaks(values.shifts);
      const firstShift = values.shifts[0];
      const lastShift = values.shifts[values.shifts.length - 1];

      const nextAvailability: AvailabilitySlot[] = (allAvailability || []).map((a) => {
        const match =
          (slot?.id && a.id === slot.id) ||
          (!slot?.id && a.dayOfWeek === slot?.dayOfWeek);
        if (!match) return a;

        return {
          ...a,
          dayOfWeek: dayOfWeek as WeekDay,
          startTime: firstShift?.startTime,
          endTime: lastShift?.endTime,
          isAvailable: values.isAvailable,
          notes: values.notes ?? "",
          slotMinutes,
          stepMinutes,
          breaks: breaks,
          availabilityBreak: breaks,
          aivblityBreak: breaks,
        };
      });

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
              isAvailable: typeof t.isAvailable === "boolean" ? t.isAvailable : true,
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
            slotMinutes: typeof (a as any).slotMinutes === "number" ? (a as any).slotMinutes : slotMinutes,
            stepMinutes: typeof (a as any).stepMinutes === "number" ? (a as any).stepMinutes : stepMinutes,
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
        title: "Availability updated",
        description: "Changes have been saved.",
        color: "success",
      });

      setDirty(false);
      onSaved();
      onCancel();
    } catch (error) {
      console.error("Update doctor availability failed:", error);
      addToast({
        title: "Save failed",
        description: "Unable to save availability. Please try again.",
        color: "danger",
      });
    }
  };

  const handleCancel = () => {
    setDirty(false);
    onCancel();
  };

  const firstShiftStart = shifts[0]?.startTime || "—";
  const lastShiftEnd = shifts[shifts.length - 1]?.endTime || "—";

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="rounded-2xl bg-white">
      {!hideHeader && (
        <>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">
                {slot.dayOfWeek}
              </div>
              <div className="text-xs text-primary">
                {firstShiftStart} - {lastShiftEnd}
                {totalSlotsCount > 0 ? ` (${totalSlotsCount} slots total)` : ""}
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

          <div className="h-px w-full bg-slate-200" />
        </>
      )}

      <div className="px-4 py-4 space-y-4">
        {/* Tip Box - Same as EditAllTimeSlots */}
        <div className="rounded-lg bg-yellow-100 px-3 py-2 text-xs text-yellow-700 space-y-1">
          <div>
            💡 <span className="font-bold text-yellow-900">Tip:</span> Configure your working hours
          </div>
          <div className="pl-4 space-y-0.5">
            <div>• <span className="font-bold text-yellow-900">Single shift:</span> Set start and end time (e.g., 9:00 AM → 3:00 PM)</div>
            <div>• <span className="font-bold text-yellow-900">Multiple shifts:</span> Click on Add Shift button to add a new shift and define its time range</div>
          </div>
        </div>

        {/* Shifts Section - Same as EditAllTimeSlots */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <span className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600">
                <FiClock className="h-4 w-4" />
              </span>
              Working Shifts
            </div>
            <Button
              type="button"
              size="sm"
              variant="bordered"
              onPress={addNewShift}
              className="rounded-full border-primary text-primary hover:bg-primary/10"
              startContent={<FiPlus className="h-3 w-3" />}
            >
              Add Shift
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => {
              const previousShiftEnd = index > 0 ? watch(`shifts.${index - 1}.endTime`) : undefined;
              const nextShiftStart = index < fields.length - 1 ? watch(`shifts.${index + 1}.startTime`) : undefined;

              return (
                <div
                  key={field.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-white text-xs font-bold">
                        {index + 1}
                      </span>
                      Shift {index + 1}
                    </div>

                    {fields.length > 1 && (
                      <Button
                        type="button"
                        isIconOnly
                        size="sm"
                        variant="light"
                        onPress={() => removeShift(index)}
                        className="text-rose-500"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-12 md:items-end">
                    <div className="md:col-span-5">
                      <Controller
                        control={control}
                        name={`shifts.${index}.startTime` as const}
                        rules={{
                          required: "Start time required",
                          validate: (value) => {
                            const startMin = parseTimeToMinutes(value);
                            if (startMin === null) return "Invalid time";

                            if (index > 0) {
                              const prevEnd = parseTimeToMinutes(previousShiftEnd);
                              if (prevEnd !== null && startMin <= prevEnd) {
                                return `Must start after Shift ${index} ends (${previousShiftEnd})`;
                              }
                            }

                            const currentEnd = watch(`shifts.${index}.endTime`);
                            const endMin = parseTimeToMinutes(currentEnd);
                            if (endMin !== null && startMin >= endMin) {
                              return "Start time must be before end time";
                            }

                            return true;
                          },
                        }}
                        render={({ field }) => (
                          <TimeSelectField
                            label={`Shift ${index + 1} - Start Time`}
                            value={field.value}
                            minTime={previousShiftEnd}
                            maxTime={nextShiftStart}
                            onChange={(v) => {
                              setValue(`shifts.${index}.startTime`, v, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                            }}
                          />
                        )}
                      />
                    </div>

                    <div className="hidden md:col-span-2 md:flex md:justify-center">
                      <div className="mt-6 grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                        <span className="text-lg">→</span>
                      </div>
                    </div>

                    <div className="md:col-span-5">
                      <Controller
                        control={control}
                        name={`shifts.${index}.endTime` as const}
                        rules={{
                          required: "End time required",
                          validate: (value) => {
                            const startMin = parseTimeToMinutes(watch(`shifts.${index}.startTime`));
                            const endMin = parseTimeToMinutes(value);

                            if (endMin === null) return "Invalid time";
                            if (startMin !== null && endMin <= startMin) {
                              return "End time must be after start time";
                            }

                            if (nextShiftStart) {
                              const nextStartMin = parseTimeToMinutes(nextShiftStart);
                              if (nextStartMin !== null && endMin >= nextStartMin) {
                                return `End time must be before Shift ${index + 2} starts (${nextShiftStart})`;
                              }
                            }

                            return true;
                          },
                        }}
                        render={({ field }) => (
                          <TimeSelectField
                            label={`Shift ${index + 1} - End Time`}
                            value={field.value}
                            minTime={watch(`shifts.${index}.startTime`)}
                            maxTime={nextShiftStart}
                            onChange={(v) => {
                              setValue(`shifts.${index}.endTime`, v, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                            }}
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {fields.length === 1 && (
            <div className="mt-3 text-center text-xs text-slate-500">
              Single shift mode. Add more shifts to create multiple working periods.
            </div>
          )}
        </div>

        <div className="h-px w-full bg-slate-200" />

        {/* Preferences - Same as EditAllTimeSlots */}
        <div className="grid gap-4 md:grid-cols-12">
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
            <input type="hidden" {...register("slotMinutes")} />
          </div>

          <div className="md:col-span-4 hidden">
            <Input
              type="number"
              min={0}
              label="Buffer Time"
              labelPlacement="outside"
              placeholder="0"
              variant="bordered"
              size="sm"
              classNames={{
                inputWrapper: "h-11 rounded-full bg-white border-slate-200",
                label: "text-xs font-semibold text-slate-700",
              }}
              {...register("stepMinutes", { required: true })}
            />
          </div>
        </div>

        {/* Footer buttons - Same as EditAllTimeSlots */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="bordered"
            onPress={handleCancel}
            disabled={isLoading || isSubmitting}
            className="rounded-full border-primary text-primary"
          >
            Cancel Changes
          </Button>

          <Button
            type="submit"
            className="rounded-full bg-primary text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            isLoading={isLoading || isSubmitting}
            isDisabled={isLoading || isSubmitting || isShiftTimeIncomplete}
          >
            Save Changes
          </Button>
        </div>

        <div className="hidden">
          <Input {...register("notes")} />
        </div>
      </div>
    </form>
  );
};

export default WeeklySlotInlineEditor;
