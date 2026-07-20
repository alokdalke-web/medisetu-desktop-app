// src/pages/clinic/EditAllTimeSlots.tsx
// import React, { useEffect, useMemo, useState } from "react";
// import {
//   Button,
//   Input,
//   Spinner,
//   addToast,
//   Select,
//   SelectItem,
// } from "@heroui/react";
// import { Controller, useFieldArray, useForm } from "react-hook-form";
// import { FiClock, FiPlus, FiTrash2 } from "react-icons/fi";
// import { useNavigate } from "react-router";

// import {
//   useGetDoctorQuery,
//   useUpdateDoctorMutation,
// } from "../../redux/api/doctorApi";

// /* ---------------- ✅ TYPES ---------------- */

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

//   noOfPatients?: number | null;

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

// const DAYS: Array<AvailabilitySlot["dayOfWeek"]> = [
//   "Monday",
//   "Tuesday",
//   "Wednesday",
//   "Thursday",
//   "Friday",
//   "Saturday",
//   "Sunday",
// ];

// const DAY_SHORT: Record<string, string> = {
//   Monday: "Mon",
//   Tuesday: "Tue",
//   Wednesday: "Wed",
//   Thursday: "Thu",
//   Friday: "Fri",
//   Saturday: "Sat",
//   Sunday: "Sun",
// };

// const looksLikeMaxPatients = (notes?: any) =>
//   /max\s*patients\s*:/i.test(String(notes || ""));

// const extractMaxPatients = (notes?: any) => {
//   const s = String(notes || "");
//   const m = s.match(/Max Patients:\s*(\d+)/i);
//   return m?.[1] || "";
// };

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

//   const m24 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
//   if (m24) return Number(m24[1]) * 60 + Number(m24[2]);

//   return null;
// }

// // function getNextLogicalTime(minTime?: string, maxTime?: string): string {
// //   const allowed = getAllowedTimeParts(minTime, maxTime);
// //   return allowed[0]?.full || "";
// // }

// function formatMinutesTo12h(total: number) {
//   const MINUTES_IN_DAY = 24 * 60;
//   const normalizedTotal =
//     ((total % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;

//   const h24 = Math.floor(normalizedTotal / 60);
//   const mm = normalizedTotal % 60;

//   const ap = h24 >= 12 ? "PM" : "AM";
//   let h12 = h24 % 12;
//   if (h12 === 0) h12 = 12;

//   return `${String(h12).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${ap}`;
// }

// function normalizeTimeLabel(v?: string | null): string {
//   if (!v) return "";

//   if (typeof v === "string" && /^\d{2}:\d{2}:\d{2}$/.test(v)) {
//     const parts = v.split(":");
//     const hours = parseInt(parts[0], 10);
//     const minutes = parts[1];
//     const ampm = hours >= 12 ? "PM" : "AM";
//     const hour12 = hours % 12 || 12;
//     return `${hour12.toString().padStart(2, "0")}:${minutes} ${ampm}`;
//   }

//   const m = parseTimeToMinutes(v);
//   if (m === null) return String(v);
//   return formatMinutesTo12h(m);
// }

// const TIME_STEP_MINUTES = 15;

// function splitTimeParts(v?: string | null): {
//   hour: string;
//   minute: string;
//   period: string;
// } {
//   const normalized = normalizeTimeLabel(v);
//   const match = normalized.match(/^(\d{2}):(\d{2})\s*(AM|PM)$/i);

//   if (!match) {
//     return { hour: "", minute: "", period: "" };
//   }

//   return {
//     hour: match[1],
//     minute: match[2],
//     period: match[3].toUpperCase(),
//   };
// }

// function buildTimeFromParts(
//   hour?: string,
//   minute?: string,
//   period?: string,
// ): string {
//   if (!hour || !minute || !period) return "";
//   return `${hour}:${minute} ${period}`;
// }

// const ALL_TIME_OPTIONS: string[] = (() => {
//   const out: string[] = [];
//   for (let m = 0; m < 24 * 60; m += TIME_STEP_MINUTES) {
//     out.push(formatMinutesTo12h(m));
//   }
//   return out;
// })();

// type TimeOptionPart = {
//   full: string;
//   hour: string;
//   minute: string;
//   period: string;
// };

// function uniqueValues(values: string[]) {
//   return Array.from(new Set(values));
// }

// function getAllowedTimeParts(
//   minTime?: string,
//   maxTime?: string,
// ): TimeOptionPart[] {
//   const minMinutes = parseTimeToMinutes(minTime);
//   const maxMinutes = parseTimeToMinutes(maxTime);

//   return ALL_TIME_OPTIONS.filter((time) => {
//     const minutes = parseTimeToMinutes(time);
//     if (minutes === null) return false;

//     if (minMinutes !== null && minutes <= minMinutes) return false;
//     if (maxMinutes !== null && minutes >= maxMinutes) return false;

//     return true;
//   }).map((time) => {
//     const parts = splitTimeParts(time);
//     return {
//       full: time,
//       hour: parts.hour,
//       minute: parts.minute,
//       period: parts.period,
//     };
//   });
// }

// function getFirstAllowedTime(minTime?: string, maxTime?: string): string {
//   const first = getAllowedTimeParts(minTime, maxTime)[0];
//   return first?.full || "";
// }

// function getFirstMatchingAllowedTime(
//   allowedTimeParts: TimeOptionPart[],
//   preferred: {
//     hour?: string;
//     minute?: string;
//     period?: string;
//   },
// ): string {
//   const exactMatch = allowedTimeParts.find(
//     (item) =>
//       (!preferred.hour || item.hour === preferred.hour) &&
//       (!preferred.minute || item.minute === preferred.minute) &&
//       (!preferred.period || item.period === preferred.period),
//   );

//   if (exactMatch) return exactMatch.full;

//   const hourMinuteMatch = allowedTimeParts.find(
//     (item) =>
//       (!preferred.hour || item.hour === preferred.hour) &&
//       (!preferred.minute || item.minute === preferred.minute),
//   );

//   if (hourMinuteMatch) return hourMinuteMatch.full;

//   const hourMatch = allowedTimeParts.find(
//     (item) => !preferred.hour || item.hour === preferred.hour,
//   );

//   if (hourMatch) return hourMatch.full;

//   return allowedTimeParts[0]?.full || "";
// }

// const TimeSelectField = ({
//   label,
//   value,
//   onChange,
//   isDisabled = false,
//   minTime,
//   maxTime,
// }: {
//   label: string;
//   value?: string;
//   onChange: (v: string) => void;
//   isDisabled?: boolean;
//   minTime?: string;
//   maxTime?: string;
// }) => {
//   const parsedValue = useMemo(() => splitTimeParts(value), [value]);

//   const [hour, setHour] = useState(parsedValue.hour);
//   const [minute, setMinute] = useState(parsedValue.minute);
//   const [period, setPeriod] = useState(parsedValue.period);

//   useEffect(() => {
//     setHour(parsedValue.hour);
//     setMinute(parsedValue.minute);
//     setPeriod(parsedValue.period);
//   }, [parsedValue.hour, parsedValue.minute, parsedValue.period]);

//   const allowedTimeParts = useMemo(
//     () => getAllowedTimeParts(minTime, maxTime),
//     [minTime, maxTime],
//   );

//   const availableHours = useMemo(() => {
//     return uniqueValues(allowedTimeParts.map((item) => item.hour));
//   }, [allowedTimeParts]);

//   const availableMinutes = useMemo(() => {
//     return uniqueValues(
//       allowedTimeParts
//         .filter((item) => !hour || item.hour === hour)
//         .map((item) => item.minute),
//     );
//   }, [allowedTimeParts, hour]);

//   const availablePeriods = useMemo(() => {
//     return uniqueValues(
//       allowedTimeParts
//         .filter(
//           (item) =>
//             (!hour || item.hour === hour) &&
//             (!minute || item.minute === minute),
//         )
//         .map((item) => item.period),
//     );
//   }, [allowedTimeParts, hour, minute]);

//   useEffect(() => {
//     const currentFullValue = buildTimeFromParts(hour, minute, period);
//     const isCurrentValueValid =
//       !!currentFullValue &&
//       allowedTimeParts.some((item) => item.full === currentFullValue);

//     if (!isCurrentValueValid && allowedTimeParts.length > 0) {
//       const fallback = allowedTimeParts[0];
//       setHour(fallback.hour);
//       setMinute(fallback.minute);
//       setPeriod(fallback.period);

//       if (fallback.full !== value) {
//         onChange(fallback.full);
//       }
//     }
//   }, [hour, minute, period, value, allowedTimeParts, onChange]);

//   useEffect(() => {
//     if (hour && !availableHours.includes(hour)) setHour("");
//   }, [hour, availableHours]);

//   useEffect(() => {
//     if (minute && !availableMinutes.includes(minute)) setMinute("");
//   }, [minute, availableMinutes]);

//   useEffect(() => {
//     if (period && !availablePeriods.includes(period)) setPeriod("");
//   }, [period, availablePeriods]);

//   const updateParts = (
//     nextHour: string,
//     nextMinute: string,
//     nextPeriod: string,
//   ) => {
//     const nextTime = buildTimeFromParts(nextHour, nextMinute, nextPeriod);

//     if (nextTime && allowedTimeParts.some((item) => item.full === nextTime)) {
//       setHour(nextHour);
//       setMinute(nextMinute);
//       setPeriod(nextPeriod);
//       onChange(nextTime);
//       return;
//     }

//     const fallbackTime = getFirstMatchingAllowedTime(allowedTimeParts, {
//       hour: nextHour || undefined,
//       minute: nextMinute || undefined,
//       period: nextPeriod || undefined,
//     });

//     if (!fallbackTime) {
//       setHour(nextHour);
//       setMinute(nextMinute);
//       setPeriod(nextPeriod);
//       return;
//     }

//     const fallbackParts = splitTimeParts(fallbackTime);

//     setHour(fallbackParts.hour);
//     setMinute(fallbackParts.minute);
//     setPeriod(fallbackParts.period);
//     onChange(fallbackTime);
//   };

//   const selectedHourKeys =
//     hour && availableHours.includes(hour) ? [hour] : undefined;

//   const selectedMinuteKeys =
//     minute && availableMinutes.includes(minute) ? [minute] : undefined;

//   const selectedPeriodKeys =
//     period && availablePeriods.includes(period) ? [period] : undefined;

//   return (
//     <div className="space-y-2">
//       <div className="text-xs font-medium text-slate-600">{label}</div>

//       <div className="flex flex-wrap gap-2 md:max-w-[300px]">
//         <Select
//           aria-label={`${label} hour`}
//           placeholder="Hour"
//           variant="bordered"
//           size="sm"
//           isDisabled={isDisabled}
//           selectedKeys={selectedHourKeys}
//           onSelectionChange={(keys) => {
//             if (keys === "all") return;
//             const first = Array.from(keys)[0];
//             updateParts(first ? String(first) : "", minute, period);
//           }}
//           className="w-[84px]"
//           classNames={{
//             trigger: "h-11 rounded-full bg-white border-slate-200 shadow-none",
//             value: "text-sm",
//           }}
//         >
//           {availableHours.map((h) => (
//             <SelectItem key={h} textValue={h}>
//               {h}
//             </SelectItem>
//           ))}
//         </Select>

//         <Select
//           aria-label={`${label} minute`}
//           placeholder="Min"
//           variant="bordered"
//           size="sm"
//           isDisabled={isDisabled}
//           selectedKeys={selectedMinuteKeys}
//           onSelectionChange={(keys) => {
//             if (keys === "all") return;
//             const first = Array.from(keys)[0];
//             updateParts(hour, first ? String(first) : "", period);
//           }}
//           className="w-[84px]"
//           classNames={{
//             trigger: "h-11 rounded-full bg-white border-slate-200 shadow-none",
//             value: "text-sm",
//           }}
//         >
//           {availableMinutes.map((m) => (
//             <SelectItem key={m} textValue={m}>
//               {m}
//             </SelectItem>
//           ))}
//         </Select>

//         <Select
//           aria-label={`${label} period`}
//           placeholder="AM/PM"
//           variant="bordered"
//           size="sm"
//           isDisabled={isDisabled}
//           selectedKeys={selectedPeriodKeys}
//           onSelectionChange={(keys) => {
//             if (keys === "all") return;
//             const first = Array.from(keys)[0];
//             updateParts(hour, minute, first ? String(first) : "");
//           }}
//           className="w-[90px]"
//           classNames={{
//             trigger: "h-11 rounded-full bg-white border-slate-200 shadow-none",
//             value: "text-sm",
//           }}
//         >
//           {availablePeriods.map((item) => (
//             <SelectItem key={item} textValue={item}>
//               {item}
//             </SelectItem>
//           ))}
//         </Select>
//       </div>
//     </div>
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
//     className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
//       active
//         ? "bg-primary text-white shadow-sm"
//         : "text-slate-600 hover:bg-slate-100"
//     }`}
//   >
//     {children}
//   </button>
// );

// /* ---------------- Form Types ---------------- */

// type ConsultMode = "time" | "token";

// type Shift = {
//   startTime: string;
//   endTime: string;
// };

// type FormValues = {
//   consultMode: ConsultMode;
//   shifts: Shift[];
//   slotMinutes: number | string;
//   stepMinutes: number | string;
//   maxPatients: string;
//   notes?: string;
// };

// function normalizeWeeklySlots(raw: any[]): AvailabilitySlot[] {
//   return (raw || []).map((slot: any) => {
//     const normalizedBreaks: Break[] =
//       slot.aivblityBreak || slot.availabilityBreak || slot.breaks || [];

//     const noOfPatients =
//       slot.noOfPatients !== undefined && slot.noOfPatients !== null
//         ? Number(slot.noOfPatients)
//         : null;

//     return {
//       id: slot.id,
//       dayOfWeek: slot.dayOfWeek,
//       startTime: slot.startTime ?? null,
//       endTime: slot.endTime ?? null,
//       breaksStart: slot.breaksStart ?? null,
//       breaksEnd: slot.breaksEnd ?? null,
//       isAvailable: Boolean(slot.isAvailable),
//       notes: slot.notes ?? "",
//       slotMinutes:
//         slot.slotMinutes !== undefined && slot.slotMinutes !== null
//           ? Number(slot.slotMinutes)
//           : 30,
//       stepMinutes:
//         slot.stepMinutes !== undefined && slot.stepMinutes !== null
//           ? Number(slot.stepMinutes)
//           : 0,
//       noOfPatients: Number.isFinite(noOfPatients) ? noOfPatients : null,
//       aivblityBreak: normalizedBreaks,
//       availabilityBreak: normalizedBreaks,
//       breaks: normalizedBreaks,
//     };
//   });
// }

// function normalizeDateOverrides(raw: any[]): DateAvailabilityItem[] {
//   return (raw || []).map((d: any) => {
//     const rawSlots: any[] = Array.isArray(d?.timeSlots) ? d.timeSlots : [];
//     return {
//       id: d?.id,
//       date: normalizeDateOnly(d?.date),
//       isAvailable: Boolean(d?.isAvailable),
//       notes: d?.notes ?? "",
//       slotMinutes:
//         d?.slotMinutes !== undefined && d?.slotMinutes !== null
//           ? Number(d.slotMinutes)
//           : 30,
//       stepMinutes:
//         d?.stepMinutes !== undefined && d?.stepMinutes !== null
//           ? Number(d.stepMinutes)
//           : 0,
//       timeSlots: rawSlots.map((ts: any) => ({
//         id: ts?.id,
//         startTime: ts?.startTime ?? "",
//         endTime: ts?.endTime ?? "",
//         isAvailable:
//           typeof ts?.isAvailable === "boolean" ? ts.isAvailable : true,
//         notes: ts?.notes ?? "",
//       })),
//     };
//   });
// }

// function pickTemplate(availability: AvailabilitySlot[]) {
//   return (
//     availability.find((d) => d.isAvailable) ||
//     availability.find((d) => d.dayOfWeek === "Monday") ||
//     availability[0]
//   );
// }

// // Convert breaks to shifts
// function breaksToShifts(
//   startTime: string,
//   endTime: string,
//   breaks: Break[],
// ): Shift[] {
//   if (!startTime || !endTime) return [];

//   const shifts: Shift[] = [];
//   let currentStart = startTime;

//   // Sort breaks by start time
//   const sortedBreaks = [...breaks].sort((a, b) => {
//     const aStart = parseTimeToMinutes(a.startTime) || 0;
//     const bStart = parseTimeToMinutes(b.startTime) || 0;
//     return aStart - bStart;
//   });

//   for (const breakItem of sortedBreaks) {
//     if (breakItem.startTime && breakItem.endTime) {
//       // Add shift before break
//       shifts.push({
//         startTime: currentStart,
//         endTime: breakItem.startTime,
//       });
//       // Start after break
//       currentStart = breakItem.endTime;
//     }
//   }

//   // Add final shift
//   shifts.push({
//     startTime: currentStart,
//     endTime: endTime,
//   });

//   return shifts.filter((shift) => {
//     const startMin = parseTimeToMinutes(shift.startTime);
//     const endMin = parseTimeToMinutes(shift.endTime);
//     return startMin !== null && endMin !== null && endMin > startMin;
//   });
// }

// // Convert shifts to breaks
// function shiftsToBreaks(shifts: Shift[]): Break[] {
//   if (shifts.length <= 1) return [];

//   const breaks: Break[] = [];
//   for (let i = 0; i < shifts.length - 1; i++) {
//     breaks.push({
//       breakType: `GAP${i + 1}`,
//       startTime: shifts[i].endTime,
//       endTime: shifts[i + 1].startTime,
//       status: true,
//       notes: null,
//     });
//   }
//   return breaks;
// }

// const EditAllTimeSlots: React.FC = () => {
//   const navigate = useNavigate();
//   const [updateDoctor, { isLoading: isSaving }] = useUpdateDoctorMutation();
//   const { data, isLoading, isFetching, isError, refetch } = useGetDoctorQuery();

//   const rawAvailability: any[] =
//     (data as any)?.result?.aivblity ??
//     (data as any)?.result?.availability ??
//     [];
//   const rawDateAvailability: any[] =
//     (data as any)?.result?.dateAvailability ?? [];

//   const availability = useMemo(
//     () => normalizeWeeklySlots(rawAvailability),
//     [rawAvailability],
//   );
//   const dateAvailability = useMemo(
//     () => normalizeDateOverrides(rawDateAvailability),
//     [rawDateAvailability],
//   );

//   const [selectedDays, setSelectedDays] = useState<Record<string, boolean>>(
//     () =>
//       DAYS.reduce(
//         (acc, d) => ({ ...acc, [d]: true }),
//         {} as Record<string, boolean>,
//       ),
//   );

//   const template = useMemo(
//     () => (availability.length ? pickTemplate(availability) : null),
//     [availability],
//   );

//   // Convert breaks to shifts for the form
//   const defaultShifts = useMemo<Shift[]>(() => {
//     if (!template) {
//       return [{ startTime: "09:00 AM", endTime: "05:00 PM" }];
//     }

//     const breaks = (template as any)?.aivblityBreak?.length
//       ? (template as any).aivblityBreak
//       : (template as any)?.availabilityBreak?.length
//         ? (template as any).availabilityBreak
//         : (template as any)?.breaks || [];

//     const shifts = breaksToShifts(
//       template.startTime || "09:00 AM",
//       template.endTime || "05:00 PM",
//       breaks,
//     );

//     return shifts.length > 0
//       ? shifts
//       : [
//           {
//             startTime: template.startTime || "09:00 AM",
//             endTime: template.endTime || "05:00 PM",
//           },
//         ];
//   }, [template]);

//   const defaults = useMemo<FormValues>(() => {
//     const t = template;

//     const maxPatientsFromBackend =
//       t?.noOfPatients !== undefined && t?.noOfPatients !== null
//         ? String(t.noOfPatients)
//         : "";

//     const maxPatientsFromNotes = extractMaxPatients(t?.notes);

//     const inferredMode: ConsultMode =
//       (t?.noOfPatients !== undefined && t?.noOfPatients !== null) ||
//       looksLikeMaxPatients(t?.notes)
//         ? "token"
//         : "time";

//     return {
//       consultMode: inferredMode,
//       shifts: defaultShifts,
//       slotMinutes: t?.slotMinutes ?? 15,
//       stepMinutes: t?.stepMinutes ?? 0,
//       maxPatients: maxPatientsFromBackend || maxPatientsFromNotes,
//       notes: t?.notes ?? "",
//     };
//   }, [template, defaultShifts]);

//   const {
//     register,
//     control,
//     handleSubmit,
//     reset,
//     watch,
//     setValue,
//     formState: { isSubmitting },
//   } = useForm<FormValues>({
//     defaultValues: defaults,
//   });

//   const { fields, append, remove } = useFieldArray({
//     control,
//     name: "shifts",
//   });

//   // Add new shift
//   const addNewShift = () => {
//     const currentShifts = watch("shifts") || [];
//     const lastShift = currentShifts[currentShifts.length - 1];

//     const lastEndMinutes = parseTimeToMinutes(lastShift?.endTime);

//     if (lastEndMinutes === null) {
//       addToast({
//         title: "Invalid last shift",
//         description: "Please set the last shift end time correctly first.",
//         color: "warning",
//       });
//       return;
//     }

//     const GAP_MINUTES = 15;
//     const DEFAULT_SHIFT_DURATION = 60;
//     const MINUTES_IN_DAY = 24 * 60;

//     const nextStartMinutes = lastEndMinutes + GAP_MINUTES;
//     const nextEndMinutes = nextStartMinutes + DEFAULT_SHIFT_DURATION;

//     if (nextStartMinutes >= MINUTES_IN_DAY || nextEndMinutes > MINUTES_IN_DAY) {
//       addToast({
//         title: "Cannot add more shifts",
//         description: "No valid time left in the same day for another shift.",
//         color: "warning",
//       });
//       return;
//     }

//     append({
//       startTime: formatMinutesTo12h(nextStartMinutes),
//       endTime: formatMinutesTo12h(nextEndMinutes),
//     });
//   };
//   // Remove shift (only if more than 1 shift exists)
//   const removeShift = (index: number) => {
//     if (fields.length > 1) {
//       remove(index);
//     }
//   };

//   useEffect(() => {
//     if (!availability.length) return;

//     setSelectedDays((prev) => {
//       const next: Record<string, boolean> = { ...prev };
//       for (const d of DAYS) {
//         const slot = availability.find((x) => x.dayOfWeek === d);
//         next[d] = slot ? !!slot.isAvailable : false;
//       }
//       return next;
//     });

//     reset(defaults);
//   }, [availability.length, reset, defaults, availability]);

//   const wSlotMinutes = Number(watch("slotMinutes")) || 15;
//   const consultMode = watch("consultMode");

//   const shifts = watch("shifts") || [];

//   const isShiftTimeIncomplete = shifts.some(
//     (shift) => !shift?.startTime?.trim() || !shift?.endTime?.trim(),
//   );

//   const toggleDayChip = (day: string) => {
//     setSelectedDays((p) => ({ ...p, [day]: !p[day] }));
//   };

//   // Validate shifts for gaps and ordering
//   const validateShifts = (shiftsList: Shift[]): string | null => {
//     for (let i = 0; i < shiftsList.length; i++) {
//       const start = parseTimeToMinutes(shiftsList[i].startTime);
//       const end = parseTimeToMinutes(shiftsList[i].endTime);

//       if (start === null || end === null) {
//         return `Shift ${i + 1}: Invalid time format`;
//       }
//       if (end <= start) {
//         return `Shift ${i + 1}: End time must be after start time`;
//       }

//       if (i > 0) {
//         const prevEnd = parseTimeToMinutes(shiftsList[i - 1].endTime);
//         if (prevEnd !== null && start <= prevEnd) {
//           return `Shift ${i + 1}: Start time must be after previous shift's end time (${shiftsList[i - 1].endTime})`;
//         }
//       }
//     }
//     return null;
//   };

//   const buildPayload = (nextAvailability: AvailabilitySlot[]) => {
//     const existingDateAvailability: DateAvailabilityItem[] = (
//       Array.isArray(dateAvailability) ? dateAvailability : []
//     ).map((d: any) => ({
//       date: normalizeDateOnly(d.date),
//       isAvailable: Boolean(d.isAvailable),
//       notes: d.notes ?? "",
//       slotMinutes: d.slotMinutes ?? 30,
//       stepMinutes: d.stepMinutes ?? 0,
//       timeSlots: Array.isArray(d.timeSlots)
//         ? d.timeSlots.map((t: any) => ({
//             startTime: t.startTime ?? "",
//             endTime: t.endTime ?? "",
//             isAvailable:
//               typeof t.isAvailable === "boolean" ? t.isAvailable : true,
//             notes: t.notes ?? "",
//           }))
//         : [],
//     }));

//     return {
//       aivblity: nextAvailability.map((a) => {
//         const maybeNoOfPatients =
//           a.noOfPatients !== undefined && a.noOfPatients !== null
//             ? Number(a.noOfPatients)
//             : null;

//         // Convert shifts to breaks for backend
//         const currentShifts = watch("shifts");
//         const breaks = shiftsToBreaks(currentShifts);

//         return {
//           dayOfWeek: a.dayOfWeek,
//           startTime: currentShifts[0]?.startTime || a.startTime,
//           endTime:
//             currentShifts[currentShifts.length - 1]?.endTime || a.endTime,
//           isAvailable: (a as any).isAvailable,
//           notes: (a as any).notes ?? "",
//           slotMinutes:
//             typeof (a as any).slotMinutes === "number"
//               ? (a as any).slotMinutes
//               : 30,
//           stepMinutes:
//             typeof (a as any).stepMinutes === "number"
//               ? (a as any).stepMinutes
//               : 0,
//           ...(Number.isFinite(maybeNoOfPatients) && maybeNoOfPatients! > 0
//             ? { noOfPatients: maybeNoOfPatients }
//             : {}),
//           aivblityBreak: breaks.map((b, idx) => ({
//             breakType: b.breakType || `GAP${idx + 1}`,
//             startTime: b.startTime,
//             endTime: b.endTime,
//             status: typeof b.status === "boolean" ? b.status : true,
//             notes: b.notes ?? "",
//           })),
//         };
//       }),
//       dateAvailability: existingDateAvailability.map((d) => ({
//         date: d.date,
//         isAvailable: d.isAvailable,
//         notes: d.notes ?? "",
//         ...(d.isAvailable
//           ? {
//               slotMinutes: Number(d.slotMinutes) || 30,
//               stepMinutes: Number(d.stepMinutes) || 0,
//               timeSlots: (d.timeSlots || []).map((ts) => ({
//                 startTime: ts.startTime,
//                 endTime: ts.endTime,
//                 isAvailable: ts.isAvailable,
//                 notes: ts.notes ?? "",
//               })),
//             }
//           : {}),
//       })),
//     } as const;
//   };

//   const onSubmit = async (values: FormValues) => {
//     try {
//       // Validate shifts
//       const shiftError = validateShifts(values.shifts);
//       if (shiftError) {
//         addToast({
//           title: "Invalid shifts",
//           description: shiftError,
//           color: "warning",
//         });
//         return;
//       }

//       let tokenPatients: number | null = null;

//       if (values.consultMode === "token") {
//         const mp = String(values.maxPatients || "").trim();
//         const n = Number(mp);

//         if (!mp || !Number.isFinite(n) || n <= 0) {
//           addToast({
//             title: "Max patients required",
//             description: "Please enter a valid number of max patients / day.",
//             color: "warning",
//           });
//           return;
//         }

//         tokenPatients = Math.floor(n);
//       }

//       const slotMinutes =
//         Number(values.slotMinutes) > 0 ? Number(values.slotMinutes) : 15;

//       const stepMinutes =
//         Number(values.stepMinutes) >= 0 ? Number(values.stepMinutes) : 0;

//       const baseMap = new Map<string, AvailabilitySlot>();
//       for (const d of availability) baseMap.set(d.dayOfWeek, d);
//       for (const d of DAYS) {
//         if (!baseMap.has(d)) {
//           baseMap.set(d, {
//             dayOfWeek: d,
//             startTime: null,
//             endTime: null,
//             isAvailable: false,
//             notes: "",
//             slotMinutes: 30,
//             stepMinutes: 0,
//             noOfPatients: null,
//             breaks: [],
//             aivblityBreak: [],
//             availabilityBreak: [],
//           });
//         }
//       }

//       const tokenNotes =
//         values.consultMode === "token" ? "Token-based OPD" : "";

//       const nextAvailability: AvailabilitySlot[] = DAYS.map((day) => {
//         const a = baseMap.get(day)!;
//         const isOn = !!selectedDays[day];
//         const firstShift = values.shifts[0];
//         const lastShift = values.shifts[values.shifts.length - 1];

//         return {
//           ...a,
//           isAvailable: isOn,
//           startTime: isOn ? firstShift?.startTime : a.startTime,
//           endTime: isOn ? lastShift?.endTime : a.endTime,
//           slotMinutes: isOn ? slotMinutes : a.slotMinutes,
//           stepMinutes: isOn ? stepMinutes : a.stepMinutes,
//           noOfPatients:
//             isOn && values.consultMode === "token" ? tokenPatients : null,
//           notes: isOn ? tokenNotes : (a.notes ?? ""),
//         };
//       });

//       await updateDoctor(buildPayload(nextAvailability) as any).unwrap();

//       addToast({
//         title: "Saved",
//         description: "Applied to selected days successfully.",
//         color: "success",
//       });

//       await refetch();
//       navigate(-1);
//     } catch (e) {
//       console.error(e);
//       addToast({
//         title: "Save failed",
//         description: "Unable to save changes. Please try again.",
//         color: "danger",
//       });
//     }
//   };

//   return (
//     <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
//       <div className="flex items-center justify-between px-6 py-4">
//         <div className="flex items-center gap-2">
//           <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-emerald-700">
//             <FiClock className="h-4 w-4" />
//           </div>
//           <div>
//             <div className="text-sm font-semibold text-slate-900">
//               Doctor Availability
//             </div>
//             <div className="text-xs text-slate-500">
//               Edit and apply to all selected days
//             </div>
//           </div>
//         </div>

//         <div className="flex items-center gap-2">
//           {(isFetching || isLoading) && <Spinner size="sm" />}
//         </div>
//       </div>

//       <div className="px-6 pb-6">
//         {isError && (
//           <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
//             Failed to load availability.
//           </div>
//         )}

//         {(isLoading || !availability.length) && (
//           <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
//             Loading…
//           </div>
//         )}

//         {!!availability.length && (
//           <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
//             {/* Days chips */}
//             <div className="rounded-2xl border border-slate-200 bg-white p-4">
//               <div className="mb-2 text-xs font-semibold text-slate-700">
//                 Which days are you available ?
//               </div>

//               <div className="flex flex-wrap gap-2">
//                 {DAYS.map((day) => {
//                   const active = !!selectedDays[day];
//                   return (
//                     <button
//                       key={day}
//                       type="button"
//                       onClick={() => toggleDayChip(day)}
//                       className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
//                         active
//                           ? "bg-primary text-white"
//                           : "bg-slate-100 text-slate-600 hover:bg-slate-200"
//                       }`}
//                     >
//                       {DAY_SHORT[day]}
//                     </button>
//                   );
//                 })}
//               </div>

//               {/* Mode Toggle */}
//               <div className="mt-5">
//                 <div className="text-sm font-medium text-slate-800">
//                   Consultation Mode
//                 </div>

//                 <Controller
//                   control={control}
//                   name="consultMode"
//                   render={({ field }) => (
//                     <div className="mt-3 flex flex-wrap gap-10">
//                       <button
//                         type="button"
//                         onClick={() => field.onChange("token")}
//                         className="flex items-center gap-2 text-sm text-slate-700"
//                       >
//                         <span
//                           className={`grid h-6 w-6 place-items-center rounded-full border ${
//                             field.value === "token"
//                               ? "border-emerald-700"
//                               : "border-slate-300"
//                           }`}
//                         >
//                           <span
//                             className={`h-4 w-4 rounded-full ${
//                               field.value === "token"
//                                 ? "bg-emerald-700"
//                                 : "bg-transparent"
//                             }`}
//                           />
//                         </span>
//                         Token System (By Number of Patients)
//                       </button>
//                       <button
//                         type="button"
//                         onClick={() => field.onChange("time")}
//                         className="flex items-center gap-2 text-sm text-slate-700"
//                       >
//                         <span
//                           className={`grid h-6 w-6 place-items-center rounded-full border ${
//                             field.value === "time"
//                               ? "border-emerald-700"
//                               : "border-slate-300"
//                           }`}
//                         >
//                           <span
//                             className={`h-4 w-4 rounded-full ${
//                               field.value === "time"
//                                 ? "bg-emerald-700"
//                                 : "bg-transparent"
//                             }`}
//                           />
//                         </span>
//                         Time Duration
//                       </button>
//                     </div>
//                   )}
//                 />
//               </div>
//             </div>

//             {/* Shifts Section */}
//             <div className="rounded-2xl border border-slate-200 bg-white p-4">
//               <div className="mb-2 space-y-1 rounded-lg bg-yellow-100 px-3 py-2 text-xs text-yellow-700">
//                 <div>
//                   💡 <span className="font-bold text-yellow-900">Tip:</span>{" "}
//                   Configure your working hours
//                 </div>
//                 <div className="space-y-0.5 pl-4">
//                   <div>
//                     •{" "}
//                     <span className="font-bold text-yellow-900">
//                       Single shift:
//                     </span>{" "}
//                     Set start and end time (e.g., 9:00 AM → 3:00 PM)
//                   </div>
//                   <div>
//                     •{" "}
//                     <span className="font-bold text-yellow-900">
//                       Multiple shifts:
//                     </span>{" "}
//                     Click on Add Shift button to add a new shift and define its
//                     time range
//                   </div>
//                 </div>
//                 <div className="mt-2 pl-4">
//                   {consultMode === "token" ? (
//                     <>
//                       <span className="font-bold text-yellow-900">
//                         Max Patients / Day:
//                       </span>{" "}
//                       Enter number of patients you can see in a day.
//                       <p>
//                         <span className="font-bold text-yellow-900">Note:</span>{" "}
//                         Token can be book in random order as well as in
//                         sequence.
//                       </p>
//                     </>
//                   ) : (
//                     <>
//                       <span className="font-bold text-yellow-900">
//                         Appointment Preferences:
//                       </span>{" "}
//                       Minutes which will be allocated for each appointment.
//                       <p>
//                         <span className="font-bold text-yellow-900">
//                           Buffer Time:
//                         </span>{" "}
//                         Minutes gap after each appointment for preparation to
//                         next appointment.
//                       </p>
//                     </>
//                   )}
//                 </div>
//               </div>

//               <div className="mb-3 flex items-center justify-between">
//                 <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
//                   <span className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600">
//                     <FiClock className="h-4 w-4" />
//                   </span>
//                   Working Shifts
//                 </div>
//                 <Button
//                   type="button"
//                   size="sm"
//                   variant="bordered"
//                   onPress={addNewShift}
//                   className="rounded-full border-primary text-primary hover:bg-primary/10"
//                   startContent={<FiPlus className="h-3 w-3" />}
//                 >
//                   Add Shift
//                 </Button>
//               </div>

//               <div className="space-y-3">
//                 {fields.map((field, index) => {
//                   const previousShiftEnd =
//                     index > 0
//                       ? watch(`shifts.${index - 1}.endTime`)
//                       : undefined;

//                   const currentShiftStart = watch(`shifts.${index}.startTime`);
//                   const currentShiftEnd = watch(`shifts.${index}.endTime`);

//                   const nextShiftStart =
//                     index < fields.length - 1
//                       ? watch(`shifts.${index + 1}.startTime`)
//                       : undefined;

//                   return (
//                     <div
//                       key={field.id}
//                       className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
//                     >
//                       <div className="mb-3 flex items-center justify-between">
//                         <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
//                           <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-xs font-bold text-white">
//                             {index + 1}
//                           </span>
//                           Shift {index + 1}
//                         </div>

//                         {fields.length > 1 && (
//                           <Button
//                             type="button"
//                             isIconOnly
//                             size="sm"
//                             variant="light"
//                             onPress={() => removeShift(index)}
//                             className="text-rose-500"
//                           >
//                             <FiTrash2 className="h-4 w-4" />
//                           </Button>
//                         )}
//                       </div>

//                       <div className="grid gap-3 md:grid-cols-12 md:items-end">
//                         <div className="md:col-span-5">
//                           <Controller
//                             control={control}
//                             name={`shifts.${index}.startTime` as const}
//                             rules={{
//                               required: "Start time required",
//                               validate: (value) => {
//                                 const startMin = parseTimeToMinutes(value);
//                                 if (startMin === null) return "Invalid time";

//                                 if (index > 0) {
//                                   const prevEnd =
//                                     parseTimeToMinutes(previousShiftEnd);
//                                   if (prevEnd !== null && startMin <= prevEnd) {
//                                     return `Must start after Shift ${index} ends (${previousShiftEnd})`;
//                                   }
//                                 }

//                                 const currentEndMin =
//                                   parseTimeToMinutes(currentShiftEnd);
//                                 if (
//                                   currentEndMin !== null &&
//                                   startMin >= currentEndMin
//                                 ) {
//                                   return "Start time must be before end time";
//                                 }

//                                 return true;
//                               },
//                             }}
//                             render={({ field }) => (
//                               <TimeSelectField
//                                 label={`Shift ${index + 1} - Start Time`}
//                                 value={field.value}
//                                 minTime={previousShiftEnd}
//                                 maxTime={nextShiftStart}
//                              onChange={(v) => {
//   setValue(`shifts.${index}.startTime`, v, {
//     shouldDirty: true,
//     shouldValidate: true,
//   });

//   const updatedEnd = watch(`shifts.${index}.endTime`);
//   const startMin = parseTimeToMinutes(v);
//   const endMin = parseTimeToMinutes(updatedEnd);
//   const allowedEndTimes = getAllowedTimeParts(v, nextShiftStart);
//   const isCurrentEndStillValid = allowedEndTimes.some(
//     (item) => item.full === updatedEnd,
//   );

//   if (
//     startMin !== null &&
//     (!updatedEnd || endMin === null || endMin <= startMin || !isCurrentEndStillValid)
//   ) {
//     const nextValidEnd = allowedEndTimes[0]?.full || "";
//     if (nextValidEnd) {
//       setValue(`shifts.${index}.endTime`, nextValidEnd, {
//         shouldDirty: true,
//         shouldValidate: true,
//       });
//     }
//   }
// }}
//                               />
//                             )}
//                           />
//                         </div>

//                         <div className="hidden md:col-span-2 md:flex md:justify-center">
//                           <div className="mt-6 grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-700">
//                             <span className="text-lg">→</span>
//                           </div>
//                         </div>

//                         <div className="md:col-span-5">
//                           <Controller
//                             control={control}
//                             name={`shifts.${index}.endTime` as const}
//                             rules={{
//                               required: "End time required",
//                               validate: (value) => {
//                                 const startMin =
//                                   parseTimeToMinutes(currentShiftStart);
//                                 const endMin = parseTimeToMinutes(value);

//                                 if (endMin === null) return "Invalid time";

//                                 if (
//                                   startMin !== null &&
//                                   (endMin === null || endMin <= startMin)
//                                 ) {
//                                   return "End time must be after start time";
//                                 }

//                                 if (nextShiftStart) {
//                                   const nextStartMin =
//                                     parseTimeToMinutes(nextShiftStart);
//                                   if (
//                                     nextStartMin !== null &&
//                                     endMin >= nextStartMin
//                                   ) {
//                                     return `End time must be before Shift ${index + 2} starts (${nextShiftStart})`;
//                                   }
//                                 }

//                                 return true;
//                               },
//                             }}
//                             render={({ field }) => (
//                               <TimeSelectField
//                                 label={`Shift ${index + 1} - End Time`}
//                                 value={field.value}
//                                 minTime={currentShiftStart}
//                                 maxTime={nextShiftStart}
//                                 onChange={(v) => {
//                                   setValue(`shifts.${index}.endTime`, v, {
//                                     shouldDirty: true,
//                                     shouldValidate: true,
//                                   });

//                                   if (index < fields.length - 1) {
//                                     const nextStart = watch(
//                                       `shifts.${index + 1}.startTime`,
//                                     );
//                                     const nextEnd = watch(
//                                       `shifts.${index + 1}.endTime`,
//                                     );

//                                     const endMin = parseTimeToMinutes(v);
//                                     const nextStartMin =
//                                       parseTimeToMinutes(nextStart);

//                                     if (
//                                       endMin !== null &&
//                                       nextStartMin !== null &&
//                                       nextStartMin <= endMin
//                                     ) {
//                                       const nextValidStart =
//                                         getFirstAllowedTime(v, nextEnd);
//                                       if (nextValidStart) {
//                                         setValue(
//                                           `shifts.${index + 1}.startTime`,
//                                           nextValidStart,
//                                           {
//                                             shouldDirty: true,
//                                             shouldValidate: true,
//                                           },
//                                         );
//                                       }
//                                     }
//                                   }
//                                 }}
//                               />
//                             )}
//                           />
//                         </div>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>

//               {fields.length === 1 && (
//                 <div className="mt-3 text-center text-xs text-slate-500">
//                   Single shift mode. Add more shifts to create multiple working
//                   periods.
//                 </div>
//               )}
//             </div>

//             {/* Time-duration specific preferences */}
//             {consultMode === "time" && (
//               <div className="rounded-2xl border border-slate-200 bg-white p-4">
//                 <div className="grid gap-4 md:grid-cols-12">
//                   <div className="md:col-span-4">
//                     <div className="text-xs font-semibold text-slate-700">
//                       Appointment Preferences
//                     </div>
//                     <div className="mt-2 inline-flex rounded-full bg-slate-100 p-1">
//                       {[15, 20, 30].map((m) => (
//                         <SegBtn
//                           key={m}
//                           active={Number(wSlotMinutes) === m}
//                           onClick={() =>
//                             setValue("slotMinutes", m, {
//                               shouldDirty: true,
//                               shouldValidate: true,
//                             })
//                           }
//                         >
//                           {m}min
//                         </SegBtn>
//                       ))}
//                     </div>
//                     <input type="hidden" {...register("slotMinutes")} />
//                   </div>

//                   <div className="md:col-span-4">
//                     <Input
//                       type="number"
//                       min={0}
//                       label="Buffer Time"
//                       labelPlacement="outside"
//                       placeholder="0"
//                       variant="bordered"
//                       size="sm"
//                       classNames={{
//                         inputWrapper:
//                           "h-11 rounded-full bg-white border-slate-200",
//                         label: "text-xs font-semibold text-slate-700",
//                       }}
//                       {...register("stepMinutes", { required: true })}
//                     />
//                   </div>
//                 </div>
//               </div>
//             )}

//             {consultMode === "token" && (
//               <div className="rounded-2xl border border-slate-200 bg-white p-4">
//                 <div className="max-w-[260px]">
//                   <Input
//                     type="number"
//                     min={1}
//                     label={
//                       <span>
//                         Max Patients / Day{" "}
//                         <span className="text-rose-500">*</span>
//                       </span>
//                     }
//                     labelPlacement="outside"
//                     placeholder="Enter total patient"
//                     variant="bordered"
//                     size="sm"
//                     classNames={{
//                       inputWrapper:
//                         "h-11 rounded-full bg-white border-slate-200 shadow-none",
//                       label: "text-xs font-semibold text-slate-700",
//                     }}
//                     {...register("maxPatients")}
//                   />
//                 </div>
//               </div>
//             )}

//             {/* Footer buttons */}
//             <div className="flex items-center justify-end gap-3 pt-2">
//               <Button
//                 type="button"
//                 variant="bordered"
//                 onPress={() => navigate(-1)}
//                 disabled={isSaving || isSubmitting}
//                 className="rounded-full border-primary text-primary"
//               >
//                 Cancel Changes
//               </Button>

//               <Button
//                 type="submit"
//                 className="rounded-full bg-primary text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
//                 isLoading={isSaving || isSubmitting}
//                 isDisabled={isSaving || isSubmitting || isShiftTimeIncomplete}
//               >
//                 Save Changes
//               </Button>
//             </div>
//           </form>
//         )}
//       </div>
//     </div>
//   );
// };

// export default EditAllTimeSlots;

import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Input,
  Spinner,
  addToast,
  Select,
  SelectItem,
} from "@heroui/react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { FiClock, FiPlus, FiTrash2 } from "react-icons/fi";
import { useNavigate } from "react-router";

import {
  useGetDoctorQuery,
  useUpdateDoctorMutation,
} from "../../redux/api/doctorApi";

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

const DAYS: Array<AvailabilitySlot["dayOfWeek"]> = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DAY_SHORT: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

const looksLikeMaxPatients = (notes?: any) =>
  /max\s*patients\s*:/i.test(String(notes || ""));

const extractMaxPatients = (notes?: any) => {
  const s = String(notes || "");
  const m = s.match(/Max Patients:\s*(\d+)/i);
  return m?.[1] || "";
};

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

  const m24 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
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

function getFirstAllowedTime(minTime?: string, maxTime?: string): string {
  const first = getAllowedTimeParts(minTime, maxTime)[0];
  return first?.full || "";
}

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

      <div className="flex flex-wrap gap-2 md:max-w-[300px]">
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
          className="w-[84px]"
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
          className="w-[84px]"
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
          className="w-[90px]"
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

/* ---------------- Form Types ---------------- */

type ConsultMode = "token" | "time";

type Shift = {
  startTime: string;
  endTime: string;
};

type FormValues = {
  consultMode: ConsultMode;
  shifts: Shift[];
  slotMinutes: number | string;
  stepMinutes: number | string;
  maxPatients: string;
  notes?: string;
};

function normalizeWeeklySlots(raw: any[]): AvailabilitySlot[] {
  return (raw || []).map((slot: any) => {
    const normalizedBreaks: Break[] =
      slot.aivblityBreak || slot.availabilityBreak || slot.breaks || [];

    const noOfPatients =
      slot.noOfPatients !== undefined && slot.noOfPatients !== null
        ? Number(slot.noOfPatients)
        : null;

    return {
      id: slot.id,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime ?? null,
      endTime: slot.endTime ?? null,
      breaksStart: slot.breaksStart ?? null,
      breaksEnd: slot.breaksEnd ?? null,
      isAvailable: Boolean(slot.isAvailable),
      notes: slot.notes ?? "",
      slotMinutes:
        slot.slotMinutes !== undefined && slot.slotMinutes !== null
          ? Number(slot.slotMinutes)
          : 30,
      stepMinutes:
        slot.stepMinutes !== undefined && slot.stepMinutes !== null
          ? Number(slot.stepMinutes)
          : 0,
      noOfPatients: Number.isFinite(noOfPatients) ? noOfPatients : null,
      aivblityBreak: normalizedBreaks,
      availabilityBreak: normalizedBreaks,
      breaks: normalizedBreaks,
    };
  });
}

function normalizeDateOverrides(raw: any[]): DateAvailabilityItem[] {
  return (raw || []).map((d: any) => {
    const rawSlots: any[] = Array.isArray(d?.timeSlots) ? d.timeSlots : [];
    return {
      id: d?.id,
      date: normalizeDateOnly(d?.date),
      isAvailable: Boolean(d?.isAvailable),
      notes: d?.notes ?? "",
      slotMinutes:
        d?.slotMinutes !== undefined && d?.slotMinutes !== null
          ? Number(d.slotMinutes)
          : 30,
      stepMinutes:
        d?.stepMinutes !== undefined && d?.stepMinutes !== null
          ? Number(d.stepMinutes)
          : 0,
      timeSlots: rawSlots.map((ts: any) => ({
        id: ts?.id,
        startTime: ts?.startTime ?? "",
        endTime: ts?.endTime ?? "",
        isAvailable:
          typeof ts?.isAvailable === "boolean" ? ts.isAvailable : true,
        notes: ts?.notes ?? "",
      })),
    };
  });
}

function pickTemplate(availability: AvailabilitySlot[]) {
  return (
    availability.find((d) => d.isAvailable) ||
    availability.find((d) => d.dayOfWeek === "Monday") ||
    availability[0]
  );
}

// Convert breaks to shifts
function breaksToShifts(
  startTime: string,
  endTime: string,
  breaks: Break[],
): Shift[] {
  if (!startTime || !endTime) return [];

  const shifts: Shift[] = [];
  let currentStart = startTime;

  // Sort breaks by start time
  const sortedBreaks = [...breaks].sort((a, b) => {
    const aStart = parseTimeToMinutes(a.startTime) || 0;
    const bStart = parseTimeToMinutes(b.startTime) || 0;
    return aStart - bStart;
  });

  for (const breakItem of sortedBreaks) {
    if (breakItem.startTime && breakItem.endTime) {
      // Add shift before break
      shifts.push({
        startTime: currentStart,
        endTime: breakItem.startTime,
      });
      // Start after break
      currentStart = breakItem.endTime;
    }
  }

  // Add final shift
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

const EditAllTimeSlots: React.FC = () => {
  const navigate = useNavigate();
  const [updateDoctor, { isLoading: isSaving }] = useUpdateDoctorMutation();
  const { data, isLoading, isFetching, isError, refetch } = useGetDoctorQuery();

  const rawAvailability: any[] =
    (data as any)?.result?.aivblity ??
    (data as any)?.result?.availability ??
    [];
  const rawDateAvailability: any[] =
    (data as any)?.result?.dateAvailability ?? [];

  const availability = useMemo(
    () => normalizeWeeklySlots(rawAvailability),
    [rawAvailability],
  );
  const dateAvailability = useMemo(
    () => normalizeDateOverrides(rawDateAvailability),
    [rawDateAvailability],
  );

  const [selectedDays, setSelectedDays] = useState<Record<string, boolean>>(
    () =>
      DAYS.reduce(
        (acc, d) => ({ ...acc, [d]: true }),
        {} as Record<string, boolean>,
      ),
  );

  const template = useMemo(
    () => (availability.length ? pickTemplate(availability) : null),
    [availability],
  );

  // Convert breaks to shifts for the form
  const defaultShifts = useMemo<Shift[]>(() => {
    if (!template) {
      return [];
    }

    // Check if all selected/available days have the same shift pattern
    const availableDays = availability.filter(slot => slot.isAvailable);
    
    if (availableDays.length > 1) {
      // Get shifts for first day
      const firstDayBreaks = (availableDays[0] as any)?.aivblityBreak?.length
        ? (availableDays[0] as any).aivblityBreak
        : (availableDays[0] as any)?.availabilityBreak?.length
          ? (availableDays[0] as any).availabilityBreak
          : (availableDays[0] as any)?.breaks || [];

      const firstDayShifts = breaksToShifts(
        availableDays[0].startTime || "",
        availableDays[0].endTime || "",
        firstDayBreaks,
      );

      // Check if all days have the same shifts
      let allSame = true;
      for (let i = 1; i < availableDays.length; i++) {
        const dayBreaks = (availableDays[i] as any)?.aivblityBreak?.length
          ? (availableDays[i] as any).aivblityBreak
          : (availableDays[i] as any)?.availabilityBreak?.length
            ? (availableDays[i] as any).availabilityBreak
            : (availableDays[i] as any)?.breaks || [];

        const dayShifts = breaksToShifts(
          availableDays[i].startTime || "",
          availableDays[i].endTime || "",
          dayBreaks,
        );

        if (dayShifts.length !== firstDayShifts.length) {
          allSame = false;
          break;
        }
        
        for (let j = 0; j < firstDayShifts.length; j++) {
          if (dayShifts[j]?.startTime !== firstDayShifts[j]?.startTime ||
              dayShifts[j]?.endTime !== firstDayShifts[j]?.endTime) {
            allSame = false;
            break;
          }
        }
        if (!allSame) break;
      }

      // If days have different shifts, return empty shifts
      if (!allSame) {
        return [];
      }
      
      // If all same, return the pattern
      if (firstDayShifts.length > 0) {
        return firstDayShifts;
      }
    }

    // For single day or when all days have same pattern
    const breaks = (template as any)?.aivblityBreak?.length
      ? (template as any).aivblityBreak
      : (template as any)?.availabilityBreak?.length
        ? (template as any).availabilityBreak
        : (template as any)?.breaks || [];

    const shifts = breaksToShifts(
      template.startTime || "",
      template.endTime || "",
      breaks,
    );

    return shifts.length > 0 ? shifts : [];
  }, [template, availability]);

  const defaults = useMemo<FormValues>(() => {
    const t = template;

    const maxPatientsFromBackend =
      t?.noOfPatients !== undefined && t?.noOfPatients !== null
        ? String(t.noOfPatients)
        : "";

    const maxPatientsFromNotes = extractMaxPatients(t?.notes);

    const inferredMode: ConsultMode =
      (t?.noOfPatients !== undefined && t?.noOfPatients !== null) ||
      looksLikeMaxPatients(t?.notes)
        ? "token"
        : "time";

    return {
      consultMode: inferredMode,
      shifts: defaultShifts,
      slotMinutes: t?.slotMinutes ?? 15,
      // stepMinutes: t?.stepMinutes ?? 0,
      stepMinutes: t?.stepMinutes ?? 0,
      maxPatients: maxPatientsFromBackend || maxPatientsFromNotes,
      notes: t?.notes ?? "",
    };
  }, [template, defaultShifts]);

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
    name: "shifts",
  });

  // Add new shift
  const addNewShift = () => {
    const currentShifts = watch("shifts") || [];
    
    // If no shifts exist, add a default shift
    if (currentShifts.length === 0) {
      append({
        startTime: "09:00 AM",
        endTime: "05:00 PM",
      });
      return;
    }
    
    const lastShift = currentShifts[currentShifts.length - 1];

    // If last shift has empty values, set default
    if (!lastShift?.endTime || lastShift.endTime === "") {
      setValue(`shifts.${currentShifts.length - 1}.startTime`, "09:00 AM");
      setValue(`shifts.${currentShifts.length - 1}.endTime`, "05:00 PM");
      return;
    }

    const lastEndMinutes = parseTimeToMinutes(lastShift.endTime);

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
  
  // Remove shift (only if more than 1 shift exists)
  const removeShift = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  useEffect(() => {
    if (!availability.length) return;

    setSelectedDays((prev) => {
      const next: Record<string, boolean> = { ...prev };
      for (const d of DAYS) {
        const slot = availability.find((x) => x.dayOfWeek === d);
        next[d] = slot ? !!slot.isAvailable : false;
      }
      return next;
    });

    reset(defaults);
  }, [availability.length, reset, defaults, availability]);

  const wSlotMinutes = Number(watch("slotMinutes")) || 15;
  const consultMode = watch("consultMode");

  const shifts = watch("shifts") || [];

  // Check if any shift has empty or invalid times
  const hasEmptyShifts = shifts.length === 0 || shifts.some(
    (shift) => !shift?.startTime?.trim() || !shift?.endTime?.trim() || 
    shift.startTime === "" || shift.endTime === ""
  );

  const isSaveDisabled = isSaving || isSubmitting || hasEmptyShifts;

  const toggleDayChip = (day: string) => {
    setSelectedDays((p) => ({ ...p, [day]: !p[day] }));
  };

  // Validate shifts for gaps and ordering
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

  const buildPayload = (nextAvailability: AvailabilitySlot[]) => {
    const existingDateAvailability: DateAvailabilityItem[] = (
      Array.isArray(dateAvailability) ? dateAvailability : []
    ).map((d: any) => ({
      date: normalizeDateOnly(d.date),
      isAvailable: Boolean(d.isAvailable),
      notes: d.notes ?? "",
      slotMinutes: d.slotMinutes ?? 30,
      stepMinutes: d.stepMinutes ?? 0,
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

    return {
      aivblity: nextAvailability.map((a) => {
        const maybeNoOfPatients =
          a.noOfPatients !== undefined && a.noOfPatients !== null
            ? Number(a.noOfPatients)
            : null;

        // Convert shifts to breaks for backend
        const currentShifts = watch("shifts");
        const breaks = shiftsToBreaks(currentShifts);

        return {
          dayOfWeek: a.dayOfWeek,
          startTime: currentShifts[0]?.startTime || a.startTime,
          endTime:
            currentShifts[currentShifts.length - 1]?.endTime || a.endTime,
          isAvailable: (a as any).isAvailable,
          notes: (a as any).notes ?? "",
          slotMinutes:
            typeof (a as any).slotMinutes === "number"
              ? (a as any).slotMinutes
              : 30,
          // stepMinutes:
          //   typeof (a as any).stepMinutes === "number"
          //     ? (a as any).stepMinutes
          //     : 0,
          stepMinutes: 0,
          ...(Number.isFinite(maybeNoOfPatients) && maybeNoOfPatients! > 0
            ? { noOfPatients: maybeNoOfPatients }
            : {}),
          aivblityBreak: breaks.map((b, idx) => ({
            breakType: b.breakType || `GAP${idx + 1}`,
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
              slotMinutes: Number(d.slotMinutes) || 30,
              stepMinutes: Number(d.stepMinutes) || 0,
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
  };

  const onSubmit = async (values: FormValues) => {
    try {
      // Validate shifts
      const shiftError = validateShifts(values.shifts);
      if (shiftError) {
        addToast({
          title: "Invalid shifts",
          description: shiftError,
          color: "warning",
        });
        return;
      }

      let tokenPatients: number | null = null;

      if (values.consultMode === "token") {
        const mp = String(values.maxPatients || "").trim();
        const n = Number(mp);

        if (!mp || !Number.isFinite(n) || n <= 0) {
          addToast({
            title: "Max patients required",
            description: "Please enter a valid number of max patients / day.",
            color: "warning",
          });
          return;
        }

        tokenPatients = Math.floor(n);
      }

      const slotMinutes =
        Number(values.slotMinutes) > 0 ? Number(values.slotMinutes) : 15;

      const stepMinutes =
        Number(values.stepMinutes) >= 0 ? Number(values.stepMinutes) : 0;

      const baseMap = new Map<string, AvailabilitySlot>();
      for (const d of availability) baseMap.set(d.dayOfWeek, d);
      for (const d of DAYS) {
        if (!baseMap.has(d)) {
          baseMap.set(d, {
            dayOfWeek: d,
            startTime: null,
            endTime: null,
            isAvailable: false,
            notes: "",
            slotMinutes: 30,
            stepMinutes: 0,
            noOfPatients: null,
            breaks: [],
            aivblityBreak: [],
            availabilityBreak: [],
          });
        }
      }

      const tokenNotes =
        values.consultMode === "token" ? "Token-based OPD" : "";

      const nextAvailability: AvailabilitySlot[] = DAYS.map((day) => {
        const a = baseMap.get(day)!;
        const isOn = !!selectedDays[day];
        const firstShift = values.shifts[0];
        const lastShift = values.shifts[values.shifts.length - 1];

        return {
          ...a,
          isAvailable: isOn,
          startTime: isOn ? firstShift?.startTime : a.startTime,
          endTime: isOn ? lastShift?.endTime : a.endTime,
          slotMinutes: isOn ? slotMinutes : a.slotMinutes,
          stepMinutes: isOn ? stepMinutes : a.stepMinutes,
          noOfPatients:
            isOn && values.consultMode === "token" ? tokenPatients : null,
          notes: isOn ? tokenNotes : (a.notes ?? ""),
        };
      });

      await updateDoctor(buildPayload(nextAvailability) as any).unwrap();

      addToast({
        title: "Saved",
        description: "Applied to selected days successfully.",
        color: "success",
      });

      await refetch();
      navigate(-1);
    } catch (e) {
      console.error(e);
      addToast({
        title: "Save failed",
        description: "Unable to save changes. Please try again.",
        color: "danger",
      });
    }
  };

  const showEmptyState = fields.length === 0;
  const showInconsistentWarning = fields.length > 0 && fields[0]?.startTime === "" && fields[0]?.endTime === "";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-emerald-700">
            <FiClock className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Doctor Availability
            </div>
            <div className="text-xs text-slate-500">
              Edit and apply to all selected days
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(isFetching || isLoading) && <Spinner size="sm" />}
        </div>
      </div>

      <div className="px-6 pb-6">
        {isError && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
            Failed to load availability.
          </div>
        )}

        {(isLoading || !availability.length) && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Loading…
          </div>
        )}

        {!!availability.length && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Days chips */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-2 text-xs font-semibold text-slate-700">
                Which days are you available ?
              </div>

              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => {
                  const active = !!selectedDays[day];
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDayChip(day)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                        active
                          ? "bg-primary text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {DAY_SHORT[day]}
                    </button>
                  );
                })}
              </div>

              {/* Mode Toggle */}
              <div className="mt-5">
                <div className="text-sm font-medium text-slate-800">
                  Consultation Mode
                </div>

                <Controller
                  control={control}
                  name="consultMode"
                  render={({ field }) => (
                    <div className="mt-3 flex flex-wrap gap-10">
                      <button
                        type="button"
                        onClick={() => field.onChange("token")}
                        className="flex items-center gap-2 text-sm text-slate-700"
                      >
                        <span
                          className={`grid h-6 w-6 place-items-center rounded-full border ${
                            field.value === "token"
                              ? "border-emerald-700"
                              : "border-slate-300"
                          }`}
                        >
                          <span
                            className={`h-4 w-4 rounded-full ${
                              field.value === "token"
                                ? "bg-emerald-700"
                                : "bg-transparent"
                            }`}
                          />
                        </span>
                        Token System (By Number of Patients)
                      </button>
                      <button
                        type="button"
                        onClick={() => field.onChange("time")}
                        className="flex items-center gap-2 text-sm text-slate-700"
                      >
                        <span
                          className={`grid h-6 w-6 place-items-center rounded-full border ${
                            field.value === "time"
                              ? "border-emerald-700"
                              : "border-slate-300"
                          }`}
                        >
                          <span
                            className={`h-4 w-4 rounded-full ${
                              field.value === "time"
                                ? "bg-emerald-700"
                                : "bg-transparent"
                            }`}
                          />
                        </span>
                        Time Duration
                      </button>
                    </div>
                  )}
                />
              </div>
            </div>

            {/* Shifts Section */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-2 space-y-1 rounded-lg bg-yellow-100 px-3 py-2 text-xs text-yellow-700">
                <div>
                  💡 <span className="font-bold text-yellow-900">Tip:</span>{" "}
                  Configure your working hours
                </div>
                <div className="space-y-0.5 pl-4">
                  <div>
                    •{" "}
                    <span className="font-bold text-yellow-900">
                      Single shift:
                    </span>{" "}
                    Set start and end time (e.g., 9:00 AM → 3:00 PM)
                  </div>
                  <div>
                    •{" "}
                    <span className="font-bold text-yellow-900">
                      Multiple shifts:
                    </span>{" "}
                    Click on Add Shift button to add a new shift and define its
                    time range
                  </div>
                </div>
                <div className="mt-2 pl-4">
                  {consultMode === "token" ? (
                    <>
                      <span className="font-bold text-yellow-900">
                        Max Patients / Day:
                      </span>{" "}
                      Enter number of patients you can see in a day.
                      {/* <p>
                        <span className="font-bold text-yellow-900">Note:</span>{" "}
                        Token can be book in random order as well as in
                        sequence.
                      </p> */}
                    </>
                  ) : (
                    <>
                      <span className="font-bold text-yellow-900">
                        Appointment Preferences:
                      </span>{" "}
                      Minutes which will be allocated for each appointment.
                      {/* <p>
                        <span className="font-bold text-yellow-900">
                          Buffer Time:
                        </span>{" "}
                        Minutes gap after each appointment for preparation to
                        next appointment.
                      </p> */}
                    </>
                  )}
                </div>
              </div>

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

              {/* Empty state message */}
              {showEmptyState && (
                <div className="mb-3 rounded-lg bg-blue-50 p-4 text-center">
                  <div className="text-xs text-blue-600">
                    Click "Add Shift" to create a working schedule that will apply to all selected days.
                  </div>
                </div>
              )}

              {/* Warning message for inconsistent shifts */}
              {showInconsistentWarning && (
                <div className="mb-3 rounded-lg bg-amber-50 p-3 text-center text-xs text-amber-800">
                  ⚠️ Different days have different shift timings. Configure shifts below to apply a common schedule to all selected days.
                </div>
              )}

              <div className="space-y-3">
                {fields.map((field, index) => {
                  // Skip rendering empty placeholder shifts when there are actual shifts
                  if (showInconsistentWarning && fields.length === 1) {
                    return null;
                  }
                  
                  const previousShiftEnd =
                    index > 0
                      ? watch(`shifts.${index - 1}.endTime`)
                      : undefined;

                  const currentShiftStart = watch(`shifts.${index}.startTime`);
                  const currentShiftEnd = watch(`shifts.${index}.endTime`);

                  const nextShiftStart =
                    index < fields.length - 1
                      ? watch(`shifts.${index + 1}.startTime`)
                      : undefined;

                  return (
                    <div
                      key={field.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-xs font-bold text-white">
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
                                  const prevEnd =
                                    parseTimeToMinutes(previousShiftEnd);
                                  if (prevEnd !== null && startMin <= prevEnd) {
                                    return `Must start after Shift ${index} ends (${previousShiftEnd})`;
                                  }
                                }

                                const currentEndMin =
                                  parseTimeToMinutes(currentShiftEnd);
                                if (
                                  currentEndMin !== null &&
                                  startMin >= currentEndMin
                                ) {
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

                                  const updatedEnd = watch(`shifts.${index}.endTime`);
                                  const startMin = parseTimeToMinutes(v);
                                  const endMin = parseTimeToMinutes(updatedEnd);
                                  const allowedEndTimes = getAllowedTimeParts(v, nextShiftStart);
                                  const isCurrentEndStillValid = allowedEndTimes.some(
                                    (item) => item.full === updatedEnd,
                                  );

                                  if (
                                    startMin !== null &&
                                    (!updatedEnd || endMin === null || endMin <= startMin || !isCurrentEndStillValid)
                                  ) {
                                    const nextValidEnd = allowedEndTimes[0]?.full || "";
                                    if (nextValidEnd) {
                                      setValue(`shifts.${index}.endTime`, nextValidEnd, {
                                        shouldDirty: true,
                                        shouldValidate: true,
                                      });
                                    }
                                  }
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
                                const startMin =
                                  parseTimeToMinutes(currentShiftStart);
                                const endMin = parseTimeToMinutes(value);

                                if (endMin === null) return "Invalid time";

                                if (
                                  startMin !== null &&
                                  (endMin === null || endMin <= startMin)
                                ) {
                                  return "End time must be after start time";
                                }

                                if (nextShiftStart) {
                                  const nextStartMin =
                                    parseTimeToMinutes(nextShiftStart);
                                  if (
                                    nextStartMin !== null &&
                                    endMin >= nextStartMin
                                  ) {
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
                                minTime={currentShiftStart}
                                maxTime={nextShiftStart}
                                onChange={(v) => {
                                  setValue(`shifts.${index}.endTime`, v, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  });

                                  if (index < fields.length - 1) {
                                    const nextStart = watch(
                                      `shifts.${index + 1}.startTime`,
                                    );
                                    const nextEnd = watch(
                                      `shifts.${index + 1}.endTime`,
                                    );

                                    const endMin = parseTimeToMinutes(v);
                                    const nextStartMin =
                                      parseTimeToMinutes(nextStart);

                                    if (
                                      endMin !== null &&
                                      nextStartMin !== null &&
                                      nextStartMin <= endMin
                                    ) {
                                      const nextValidStart =
                                        getFirstAllowedTime(v, nextEnd);
                                      if (nextValidStart) {
                                        setValue(
                                          `shifts.${index + 1}.startTime`,
                                          nextValidStart,
                                          {
                                            shouldDirty: true,
                                            shouldValidate: true,
                                          },
                                        );
                                      }
                                    }
                                  }
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

              {!showEmptyState && !showInconsistentWarning && fields.length === 1 && (
                <div className="mt-3 text-center text-xs text-slate-500">
                  Single shift mode. Add more shifts to create multiple working periods.
                </div>
              )}
            </div>

            {/* Time-duration specific preferences */}
            {consultMode === "time" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
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

                  {/* <div className="md:col-span-4">
                    <Input
                      type="number"
                      min={0}
                      label="Buffer Time"
                      labelPlacement="outside"
                      placeholder="0"
                      variant="bordered"
                      size="sm"
                      classNames={{
                        inputWrapper:
                          "h-11 rounded-full bg-white border-slate-200",
                        label: "text-xs font-semibold text-slate-700",
                      }}
                      {...register("stepMinutes", { required: true })}
                    />
                  </div> */}
                </div>
              </div>
            )}

            {consultMode === "token" && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="max-w-[260px]">
                  <Input
                    type="number"
                    min={1}
                    label={
                      <span>
                        Max Patients / Day{" "}
                        <span className="text-rose-500">*</span>
                      </span>
                    }
                    labelPlacement="outside"
                    placeholder="Enter total patient"
                    variant="bordered"
                    size="sm"
                    classNames={{
                      inputWrapper:
                        "h-11 rounded-full bg-white border-slate-200 shadow-none",
                      label: "text-xs font-semibold text-slate-700",
                    }}
                    {...register("maxPatients")}
                  />
                </div>
              </div>
            )}

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="bordered"
                onPress={() => navigate(-1)}
                disabled={isSaving || isSubmitting}
                className="rounded-full border-primary text-primary"
              >
                Cancel Changes
              </Button>

              <Button
                type="submit"
                className="rounded-full bg-primary text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                isLoading={isSaving || isSubmitting}
                isDisabled={isSaveDisabled}
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditAllTimeSlots;