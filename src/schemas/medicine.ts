export type CreateMedicineRequestDto = {
  name: string;
  genericName: string;
  manufacturer: string;
  composition: string;
  form: string;
  strength: string;
  category: string;
  requiresPrescription: boolean;
};

export type ApiBaseResponse<T = any> = {
  success?: boolean;
  message?: string;
  status?: number | string;
  result?: T;
};

export type MedicineDto = {
  id?: string;
  name: string;
  genericName: string;
  manufacturer: string;
  composition: string;
  form: string;
  strength: string;
  category: string;
  requiresPrescription: boolean;
};
