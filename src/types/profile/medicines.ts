import type React from "react";

export type MedicineRow = {
  id: string;

  medicine: string; // genericName
  brandName: string; // name
  manufacturer: string;
  composition: string;
  form: string;
  strength: string;
  category: string;
  requiresPrescription?: boolean;
  isFavorite?: boolean;
  isActive?: boolean;
};

export type SingleMedicineValues = {
  medicine: string; // genericName
  brandName: string; // name
  manufacturer: string;
  composition: string;
  form: string;
  strength: string;
  category: string;

  // keep to avoid accidentally setting true -> false on edit
  requiresPrescription?: boolean;
};

// Edit needs id
export type EditInitial =
  | (Partial<SingleMedicineValues> & { id?: string })
  | undefined;

export type AddMedicineModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;

  mode?: "add" | "edit";
  initial?: EditInitial;
};

export type AutoBoxProps = {
  open: boolean;
  setOpen: (v: boolean) => void;
  idx: number;
  setIdx: (v: number | ((p: number) => number)) => void;
  suggestions: string[];
  isFetching: boolean;
  onPick: (v: string) => void;
  query: string;
  boxRef: React.RefObject<HTMLDivElement | null>;
};
