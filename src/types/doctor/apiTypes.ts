/** A clinic service offered by a specific doctor (User Details page). */
export type DoctorServiceItem = {
  id: string;
  serviceName: string;
  price: number | null;
  currency: string;
  durationDays: number | null;
  canBeBookedByPatient: boolean;
};

/** A single recent-appointment entry in a doctor's activity feed. */
export type DoctorActivityItem = {
  id: string;
  appointmentDate: string;
  appointmentTime: string | null;
  appointmentStatus: string;
  appointmentType: string;
  patientName: string | null;
  serviceName: string | null;
};

/** A break within a day's availability window. */
export type DoctorAvailabilityBreakItem = {
  id: string;
  clinicAvailabilityId: string;
  breakType: string;
  startTime: string | null;
  endTime: string | null;
};

/** A doctor's clinic availability for a single day of the week. */
export type DoctorAvailabilityItem = {
  id: string;
  dayOfWeek: string;
  startTime: string | null;
  endTime: string | null;
  isAvailable: boolean;
  slotMinutes: number | null;
  stepMinutes: number | null;
  noOfPatients: number | null;
  breaks: DoctorAvailabilityBreakItem[];
};

/** A single qualification entry (doctors can hold multiple). */
export type DoctorQualificationItem = {
  id: string;
  qualificationType: string;
  qualificationTitle: string;
  specialization: string | null;
  boardOrUniversity: string | null;
  yearOfCompletion: number | null;
};
