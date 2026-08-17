export type Gender = "Male" | "Female" | "Other";
export type PrescriptionStatus =
  | "PENDING"
  | "ON_HOLD"
  | "COMPLETED"
  | "REJECTED";

/* Prescription queue detail */
export interface Doctor {
  name: string;
  specialization: string | null;
}

export interface Patient {
  name: string;
  age: number;
  gender: Gender;
  mobile: string;
}

export interface Medicine {
  id: string;
  medicineName: string;
  composition: string;
  strength: string;
  dosage: string;
  frequency: string;
  duration: string;
  manufacturer: string;
  medicineCount: string;
  notes: string | null;
  createdAt: string;
}
export interface InvoiceBatch {
  batchItemId: string;
  expiryDate: string;
  sellingPrice: string;
  availableQty: number;
}

export interface InvoicePreviewItem {
  prescriptionId: string;
  medicineName: string;

  status: "READY" | "NO_MATCH" | "MULTIPLE_MATCH" | "OUT_OF_STOCK";

  // Present only when READY
  productId?: string;
  productName?: string;
  strength?: string | null;
  unitPrice?: string; // money as string (OK)
  availableStock?: number;

  batches?: InvoiceBatch[];
  quantity?: number;
}

export interface PrescriptionQueueDetail {
  id: string;
  reportId: string;
  pharmacyId: string;
  status: PrescriptionStatus;
  createdAt: string;
  doctor: Doctor;
  patient: Patient;
  medicines: Medicine[];
  invoicePreview?: {
    items: InvoicePreviewItem[];
  } | null;
}

export interface PrescriptionQueueDetailResponse {
  success: boolean;
  result: PrescriptionQueueDetail;
}

/* Prescription queue list */
export interface PrescriptionQueueItem {
  id: string;
  status: PrescriptionStatus;
  createdAt: string;
  doctorName: string;
  patientName: string;
  medicineNames: string[];
}

export interface PrescriptionQueueResult {
  data: PrescriptionQueueItem[];
  total: number;
  page: number | null;
  limit: number;
}

export interface PrescriptionQueueListResponse {
  success: boolean;
  result: PrescriptionQueueResult;
}

export interface UpdatePrescriptionStatusRequest {
  id: string;
  status: PrescriptionStatus;
}

export interface UpdatePrescriptionStatusResponse {
  success: boolean;
  message?: string;
}
