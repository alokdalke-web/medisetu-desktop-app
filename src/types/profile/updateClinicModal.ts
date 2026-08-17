import type { AvailabilitySlot, DateAvailabilityItem } from "../../pages/profile/ClinicAvailability";
import type { Break } from "./clinicAvailability";

export type UpdateClinicModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;

  slot: AvailabilitySlot | null;
  allAvailability: AvailabilitySlot[];

  allDateAvailability?: DateAvailabilityItem[];

  onSaved: () => void;
};

export type UpdateClinicModalFormValues = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  notes?: string;
  slotMinutes: number | string;
  stepMinutes: number | string;
  breaks: Break[];
};
