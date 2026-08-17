/**
 * `ClinicAvailabilityLeavesTab.tsx` is currently unused/unimported anywhere in the codebase
 * (verified via repo-wide grep) — these types are kept distinct from `clinicAvailability.ts`'s
 * similarly-named ones since the two components aren't related despite the naming overlap.
 */
export type LeavesTabDateTimeSlot = {
  id?: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  notes?: string | null;
};

export type LeavesTabDateAvailabilityItem = {
  id?: string;
  date: string; // YYYY-MM-DD
  isAvailable: boolean; // false => Full day leave, true => custom working hours
  notes?: string | null;
  slotMinutes?: number;
  stepMinutes?: number;
  timeSlots: LeavesTabDateTimeSlot[];
};

/** AvailabilitySlot only needed to keep payload shape correct */
export type LeavesTabBreak = {
  breakType?: string | null;
  startTime: string;
  endTime: string;
  status?: boolean;
  notes?: string | null;
};

export type LeavesTabAvailabilitySlot = {
  id?: string;
  dayOfWeek: string;
  startTime: string | null;
  endTime: string | null;
  isAvailable: boolean;
  notes?: string | null;
  slotMinutes?: number;
  stepMinutes?: number;
  aivblityBreak?: LeavesTabBreak[];
  availabilityBreak?: LeavesTabBreak[];
  breaks?: LeavesTabBreak[];
};

export type LeavesTabDraft = {
  key: string; // local key (id/date/tmp)
  id?: string;
  date: string; // YYYY-MM-DD
  exceptionType: "full" | "custom"; // full day leave OR custom working hours
  from: string; // for custom
  to: string; // for custom
};

export type ClinicAvailabilityLeavesTabProps = {
  isLoading: boolean;

  /** Needed so we can save/delete by calling update payload */
  availability: LeavesTabAvailabilitySlot[];
  dateAvailability: LeavesTabDateAvailabilityItem[];

  /** call API in parent OR refetch in parent after save/delete */
  onSaveAll: (nextDateAvailability: LeavesTabDateAvailabilityItem[]) => Promise<void>;
};
