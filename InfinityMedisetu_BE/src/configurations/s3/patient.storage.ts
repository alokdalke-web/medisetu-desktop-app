import multer from 'multer';
import { createS3Storage } from './client';

const patientGalleryStorage = createS3Storage('patient_gallery', [
  'jpg',
  'png',
  'jpeg',
  'webp',
  'gif',
]);

const patientTestsStorage = createS3Storage('patient_tests', [
  'pdf',
  'doc',
  'docx',
  'jpg',
  'png',
  'jpeg',
  'webp',
]);

export const uploadPatientGallery = multer({ storage: patientGalleryStorage });
export const uploadPatientTest = multer({ storage: patientTestsStorage });
