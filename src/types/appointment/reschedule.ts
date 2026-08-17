/**
 * Reschedule's slot shape is a superset of the New Appointment flow's
 * (`new-appointment/types.ts`) — it carries `appointmentId`/`appointmentStatus`/
 * `patientId`/`source` so the reschedule form can recognize "this slot is the
 * appointment's own current booking" and `shift1`/`shift2` labels from the API.
 * Deliberately NOT merged with the New Appointment `Slot`/`TimeSlot`/`TokenSlot`
 * types — same shape at a glance, different fields, different reason to exist.
 */
export type SlotStatus = "available" | "reserved" | "booked" | "break";

export type TimeSlot = {
  kind: "time";
  id: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  status: SlotStatus;
  durationMinutes: number;
  dateIso: string; // "YYYY-MM-DD"
  weekday: string; // "Mon" | ...
  appointmentId?: string;
  appointmentStatus?: string;
  patientId?: string;
  source?: string;
  shift1?: string;
  shift2?: string;
};

export type TokenSlot = {
  kind: "token";
  id: string;
  tokenNo: number;
  status: SlotStatus;
  dateIso: string;
  weekday: string;
  clinicAvailabilityId?: string;
  shift1?: string;
  shift2?: string;
};

export type Slot = TimeSlot | TokenSlot;

export type RescheduleLocationState = { appointmentId?: string; doctorId?: string };

export type RescheduleFormValues = {
  appointmentDate: any;
  appointmentTime: string | null;
  reason?: string | null;
};

export type RescheduleDayRange = 7 | 15 | 30;
