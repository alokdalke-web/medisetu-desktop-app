/**
 * `AvailabilitySlot`/`WeeklyEditorProps`/`DayRowProps` etc. in `ClinicAvailability.tsx` are
 * deliberately NOT extracted here — `AvailabilitySlot["dayOfWeek"]` is tied to `WeekDay`, a
 * module-private union type in `pages/clinic/WeeklySlotInlineEditor.tsx` (not exported), so
 * extracting `AvailabilitySlot` standalone would have widened that field to `string`, a real
 * type-safety regression. Left co-located with the component they're derived from.
 */
export type Break = {
  breakType?: string | null;
  startTime: string;
  endTime: string;
  status?: boolean;
  notes?: string | null;
};
