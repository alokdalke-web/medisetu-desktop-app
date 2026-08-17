import type { GenderOpt } from "./addPatient";

export type PatientEditFormValues = {
  name: string;
  email?: string;
  gender: GenderOpt;
  age?: number | string;
  mobile: string;
  alternateMobile?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  notesMedicalHistory?: string;
  bloodGroup?: string;
  height?: string;
  weight?: string;
  allergies?: string[];
  chronicConditions?: string[];
};
