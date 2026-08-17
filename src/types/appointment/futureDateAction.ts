/** The two status actions that are guarded when the appointment is future-dated. */
export type FutureDateAction = "confirm" | "arrived";

export interface FutureDateActionModalProps {
  /** Which action is awaiting confirmation; `null` keeps the modal closed. */
  action: FutureDateAction | null;
  onClose: () => void;
  onConfirm: () => void;
  /** Display date of the appointment, e.g. "09 August 2026". */
  appointmentDate: string;
  /** Display time / slot of the appointment, e.g. "01:30 PM". */
  appointmentTime?: string;
  patientName?: string;
  doctorName?: string;
  /** Days between today and the appointment day (used for the "in N days" hint). */
  daysAway?: number;
  isLoading?: boolean;
}
