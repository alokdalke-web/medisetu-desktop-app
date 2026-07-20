// ─── S3 Client & Utilities ──────────────────────────────────
export {
  s3Client,
  BUCKET_NAME,
  createS3Storage,
  uploadBufferToS3,
  deleteFromS3,
} from './client';

// ─── Domain-specific Upload Middleware ──────────────────────

// Appointment / Medical
export {
  upload,
  uploadConsentFile,
  uploadPrescription,
} from './appointment.storage';

// Banner
export { uploadBannerImage, uploadBannerForm } from './banner.storage';

// Clinic
export { uploadClinicLogo, uploadClinicForm } from './clinic.storage';

// Doctor
export {
  uploadDoctorGallery,
  uploadDoctorManualTemplate,
  uploadDoctorManualPrescription,
} from './doctor.storage';

// Patient
export { uploadPatientGallery, uploadPatientTest } from './patient.storage';

// User
export { uploadProfilePicture } from './user.storage';
