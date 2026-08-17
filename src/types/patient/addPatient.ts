import type React from "react";
import type { Control, FieldValues, UseFormSetValue } from "react-hook-form";

/* ── AddPatient page ── */
export type GenderOpt = "Male" | "Female" | "Other" | "";

export type AddPatientFormValues = {
  name: string;
  email?: string;
  gender: GenderOpt;
  age?: number | string;
  dob?: string | Date | null | { year: number; month: number; day: number };
  countryCallingCode?: string;
  countryCode?: string;
  mobile: string;
  alternateMobile?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  profileImageUrl?: string;
  notesMedicalHistory?: string;
  bloodGroup?: string;
  height?: string;
  weight?: string;
  allergies?: string[];
  chronicConditions?: string[];

  // Family-relation linking (UI-only control fields)
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

/* ── PatientFormSections ── */
export type PatientFormSectionsProps = {
  control: Control<FieldValues, FieldValues>;
  onCityStateChange: (city: string, state: string) => void;
  /** Ref wrappers for keyboard navigation (Add Patient uses these) */
  nameFieldRef?: React.RefObject<HTMLDivElement | null>;
  genderFieldRef?: React.RefObject<HTMLDivElement | null>;
  ageFieldRef?: React.RefObject<HTMLDivElement | null>;
  mobileFieldRef?: React.RefObject<HTMLDivElement | null>;
  cityFieldRef?: React.RefObject<HTMLDivElement | null>;
  /** Keyboard navigation handler (Add Patient uses this) */
  moveOnEnter?: (
    e: React.KeyboardEvent<HTMLDivElement>,
    nextRef: React.RefObject<HTMLDivElement | null>,
    selector?: string,
  ) => void;
  /** CSS class for required asterisk styling (Add Patient uses this) */
  reqAsterisk?: string;
  /** Show city validation error externally (Add Patient) */
  cityError?: string;
  /** Optional custom renderer for the address field (replaces default InputField) */
  renderAddressField?: () => React.ReactNode;
  /** When true, the mobile field is read-only (linked family member) */
  disableMobile?: boolean;
};

/* ── PatientFormSidebar ── */
export type PatientFormSidebarProps = {
  /** Live-watched form values for the preview card */
  watchedName?: string;
  watchedAge?: string | number;
  watchedGender?: string;
  watchedMobile?: string;
  watchedCity?: string;
  watchedState?: string;
  /** Completion percentage (0–100) based on filled required fields */
  completionPercent?: number;
  /** Whether we're in "edit" mode (shows different labels) */
  mode?: "add" | "edit";
};

/* ── FamilyRelationSection ──
   NOTE: `FamilyRelationship` is deliberately NOT extracted here — it's derived via
   `typeof RELATIONSHIP_OPTIONS[number]["value"]` from a runtime const that lives in
   the component file. Moving the type without the const it's derived from would
   either duplicate the options list or force the const itself into a "types" file,
   which isn't a type. Left co-located with its source of truth. */
export type DuplicateFamilyCandidate = {
  name?: unknown;
  gender?: unknown;
  age?: unknown;
  relationship?: unknown;
};

export type DuplicateFamilyResult = {
  name: string;
  relationship?: string;
  message: string;
};

/** Ref handle exposed to parent forms */
export interface FamilyRelationSectionRef {
  checkMobile: (mobile: string) => void;
  getDuplicateFamilyMember: (
    candidate: DuplicateFamilyCandidate,
  ) => DuplicateFamilyResult | null;
}

export interface FamilyRelationSectionProps<T extends FieldValues> {
  control: Control<T, any, any>;
  setValue: UseFormSetValue<T>;
  /** Live value of the patient's own mobile field */
  mobileValue: string;
  relationshipError?: string;
  onFamilyContextChange?: () => void;
}
