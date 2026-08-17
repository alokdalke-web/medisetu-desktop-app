// src/schemas/prescription.ts
export type Dose = { morning: boolean; noon: boolean; night: boolean; days: number };

export type PrescriptionItemInput = {
  medicineId: string;     // <- SelectedMed.id
  name: string;
  image?: string | null;
  dose: Dose;             // { morning, noon, night, days }
  notes?: string;
};

export type CreatePrescriptionDto = {
  appointmentId: string;
  items: PrescriptionItemInput[];
};

export type PrescriptionItem = PrescriptionItemInput & { id: string };

export type Prescription = {
  id: string;
  appointmentId: string;
  items: PrescriptionItem[];
  createdAt: string;
  updatedAt?: string;
};
