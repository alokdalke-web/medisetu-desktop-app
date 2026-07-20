/**
 * Appointment Engine - Core Interfaces and Types
 *
 * Defines all service interfaces and shared types for the real-time
 * appointment flow management engine.
 */

// ─── Appointment Status ──────────────────────────────────────────────────────

export type AppointmentStatus =
  | 'Upcoming'
  | 'Confirmed'
  | 'Patient Arrived'
  | 'Completed'
  | 'Cancelled'
  | 'NoShow';

// ─── Shared Types ────────────────────────────────────────────────────────────

export interface AppointmentRecord {
  id: string;
  appointmentDate: Date;
  appointmentTime: string | null;
  tokenNo: number | null;
  appointmentStatus: AppointmentStatus;
  clinicId: string;
  patientId: string;
  doctorId: string;
  appointmentDurationMinutes: string | null;
  userId: string;
}

export interface QueueDelayData {
  clinicId: string;
  doctorId: string;
  date: string;
  cumulativeDelayMinutes: number;
  lastCalculatedAt: string;
  appointments: AppointmentDelayEntry[];
}

export interface AppointmentDelayEntry {
  appointmentId: string;
  patientId: string;
  userId: string;
  status: AppointmentStatus;
  scheduledTime: string | null;
  tokenNo: number | null;
  projectedStartTime: string;
  estimatedWaitMinutes: number;
  durationMinutes: number;
}

export interface ShiftResult {
  shiftedAppointments: Array<{
    appointmentId: string;
    patientId: string;
    userId: string;
    oldTime: string;
    newTime: string;
  }>;
}

// ─── Service Interfaces ──────────────────────────────────────────────────────

export interface IAppointmentEngineOrchestrator {
  onStatusChange(
    appointment: AppointmentRecord,
    previousStatus: AppointmentStatus
  ): Promise<void>;
}

export interface IDelayTrackerService {
  recalculate(
    clinicId: string,
    doctorId: string,
    date: string
  ): Promise<QueueDelayData>;
  getEstimatedWaitTime(appointmentId: string): Promise<number>;
  getQueueDelayData(
    clinicId: string,
    doctorId: string,
    date: string
  ): Promise<QueueDelayData | null>;
}

export interface IRunningLateNotifier {
  evaluate(clinicId: string, doctorId: string, date: string): Promise<void>;
}

export interface INoShowShiftService {
  shiftForward(noShowAppointmentId: string): Promise<ShiftResult>;
}

export interface ITimeToNextService {
  compute(
    clinicId: string,
    doctorId: string,
    date: string
  ): Promise<number | null>;
  computeAndBroadcast(
    clinicId: string,
    doctorId: string,
    date: string
  ): Promise<number | null>;
}

export interface IQueueBroadcastService {
  emitQueueUpdated(clinicId: string, queueData: QueueDelayData): void;
  emitPatientUpdated(queueData: QueueDelayData): Promise<void>;
}
