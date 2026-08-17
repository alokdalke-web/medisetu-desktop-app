export type GenderOpt = "Male" | "Female" | "Other" | "";

export type AddPatientFormValues = {
  name: string;
  gender: GenderOpt;
  age?: number | string;
  mobile: string;
  alternateMobile?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  linkFamily?: boolean;
  relationship?: string;
  primaryPatientId?: string;
  primaryPatientName?: string;
};

export type VoicePatientForm = {
  name: string;
  gender: GenderOpt;
  age: string;
  mobile: string;
  alternateMobile: string;
  address: string;
  city: string;
  state: string;
};

export type QuickAddPatientModalProps = {
  isOpen: boolean;
  onClose: () => void;
  queryText?: string;
  onCreated: (patient: { id: string; name: string; mobile: string }) => void;
};
