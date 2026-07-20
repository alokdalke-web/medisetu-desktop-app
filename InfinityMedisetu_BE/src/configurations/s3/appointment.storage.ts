import multer from 'multer';
import { createS3Storage } from './client';

const medicalReportsStorage = createS3Storage('medical_reports', [
  'pdf',
  'jpg',
  'png',
  'jpeg',
]);

const consentFilesStorage = createS3Storage('consent_files', [
  'pdf',
  'jpg',
  'png',
  'jpeg',
]);

const prescriptionsStorage = createS3Storage('prescriptions', [
  'pdf',
  'doc',
  'docx',
  'jpg',
  'png',
  'jpeg',
  'webp',
]);

export const upload = multer({ storage: medicalReportsStorage });
export const uploadConsentFile = multer({ storage: consentFilesStorage });
export const uploadPrescription = multer({ storage: prescriptionsStorage });
