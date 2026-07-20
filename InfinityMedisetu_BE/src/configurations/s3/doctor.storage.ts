import multer from 'multer';
import { createS3Storage } from './client';

const doctorGalleryStorage = createS3Storage('doctor_gallery', [
  'jpg',
  'png',
  'jpeg',
  'webp',
  'gif',
]);

const doctorManualTemplatesStorage = createS3Storage(
  'doctor_manual_templates',
  ['jpg', 'png', 'jpeg', 'webp']
);

const doctorManualPrescriptionsStorage = createS3Storage(
  'doctor_manual_prescriptions',
  ['jpg', 'png', 'jpeg', 'webp']
);

export const uploadDoctorGallery = multer({ storage: doctorGalleryStorage });
export const uploadDoctorManualTemplate = multer({
  storage: doctorManualTemplatesStorage,
});
export const uploadDoctorManualPrescription = multer({
  storage: doctorManualPrescriptionsStorage,
});
