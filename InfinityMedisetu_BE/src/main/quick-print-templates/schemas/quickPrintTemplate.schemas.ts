import { z } from 'zod';

const templateIds = [
  'compact-medicine-slip',
  'standard-medicine-sheet',
  'minimal-prescription',
  'pharmacy-copy',
  'detailed-prescription',
  'clinic-branded',
] as const;

const sectionNames = [
  'clinicHeader',
  'patientInfo',
  'diagnosis',
  'medicineTable',
  'advice',
  'followUp',
  'doctorSignature',
  'footer',
] as const;

export const elementConfigSchema = z.object({
  showClinicHeader: z.boolean().optional(),
  showClinicLogo: z.boolean().optional(),
  showPatientName: z.boolean().optional(),
  showPatientUhid: z.boolean().optional(),
  showPatientAge: z.boolean().optional(),
  showPatientGender: z.boolean().optional(),
  showPatientMobile: z.boolean().optional(),
  showPatientAddress: z.boolean().optional(),
  showVisitDate: z.boolean().optional(),
  showDiagnosis: z.boolean().optional(),
  showMedicineTable: z.boolean().optional(),
  showMedicineComposition: z.boolean().optional(),
  showMedicineQuantity: z.boolean().optional(),
  showMedicineInstructions: z.boolean().optional(),
  showAdvice: z.boolean().optional(),
  showFollowUp: z.boolean().optional(),
  showDoctorName: z.boolean().optional(),
  showDoctorQualification: z.boolean().optional(),
  showDoctorRegistration: z.boolean().optional(),
  showDoctorSignature: z.boolean().optional(),
  showQrCode: z.boolean().optional(),
  showFooter: z.boolean().optional(),
  sectionOrder: z.array(z.enum(sectionNames)).optional(),
});

export const saveQuickPrintTemplateSchema = z.object({
  selectedTemplate: z.enum(templateIds),
  fontFamily: z.string().max(100).optional(),
  accentColor: z.string().max(20).optional(),
  elementConfig: elementConfigSchema.optional(),
});

export type SaveQuickPrintTemplateDto = z.infer<
  typeof saveQuickPrintTemplateSchema
>;
