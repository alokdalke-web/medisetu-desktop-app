import type { AvailabilitySlot, DateAvailabilityItem } from "../../pages/profile/ClinicAvailability";

/**
 * `ExceptionType` is a true duplicate between `LeavesInlineEditor.tsx` and
 * `UpdateDateOverrideModal.tsx` (identical union) — unified here. `LeaveForm`/`Props`/`FormValues`
 * genuinely differ between the two files (LeavesInlineEditor's `LeaveForm` carries
 * `originalDate`/`slotMinutes`/`stepMinutes` that the modal's doesn't) — kept distinct.
 */
export type ExceptionType = "FULL_DAY_LEAVE" | "CUSTOM_WORKING_HOURS";

/* ── LeavesInlineEditor ── */
export type LeavesInlineEditorLeaveForm = {
  originalDate?: string;
  date: string;
  exceptionType: ExceptionType;
  fromTime: string;
  toTime: string;
  slotMinutes: number;
  stepMinutes: number;
};

export type LeavesInlineEditorFormValues = {
  leaves: LeavesInlineEditorLeaveForm[];
};

export type LeavesInlineEditorProps = {
  initialDateItem: DateAvailabilityItem | null;
  allDateAvailability: DateAvailabilityItem[];
  onCancel: () => void;
  onSaved: () => void;
};

export type TimeSelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export type DatePickerFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  title?: string;
};

/* ── UpdateDateOverrideModal ── */
export type UpdateDateOverrideModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;

  // existing single edit still supported (prefills first card)
  dateItem: DateAvailabilityItem | null;

  // kept for parent compatibility
  allAvailability: AvailabilitySlot[];
  allDateAvailability: DateAvailabilityItem[];

  onSaved: () => void;
};

export type UpdateDateOverrideModalLeaveForm = {
  date: string; // YYYY-MM-DD
  exceptionType: ExceptionType;
  fromTime: string; // "09:00 AM"
  toTime: string;   // "05:00 PM"
};

export type UpdateDateOverrideModalFormValues = {
  leaves: UpdateDateOverrideModalLeaveForm[];
};
