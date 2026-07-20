// src/main/appointments/routes/v1/appointments.route.ts
import express from 'express';

import {
  requireAuth,
  requireAdmin,
  requireClinic,
  requireReceptionist,
  enforceClinicAutoLogout,
  requireDoctor,
} from '../../../../middlewear/auth.middleware';
import { validate } from '../../../../middlewear/validation.middleware';

import {
  createAppointmentController,
  getAllClinicAppointmentController,
  getClinicAppointmentDetailsController,
  getAllUserAppointmentController,
  getAppointmentController,
  getAppointmentHistoryController,
  getAvailableSlotsForDateController,
  getDcotorApppointmentController,
  getPatientApppointmentController,
  updateAppointmentController,
  markAsNoShowController,
  setNoShowPolicyController,
  getNoShowPolicyController,
  getPatientNoShowHistoryController,
  getClinicNoShowAnalyticsController,
  getAppointmentPaymentsController,
  getLastPatientReportCardController,
  createPatientGalleryController,
  getPatientGalleryController,
  deletePatientGalleryController,
  deleteAppointmentGalleryController,
  createDoctorGalleryController,
  getDoctorGalleryController,
  deleteDoctorGalleryController,
  getDoctorGalleryBySpecialtyController,
  updateConsentFileController,
  upsertDoctorManualPrescriptionController,
  sendManualPrescriptionLinkController,
  getMedicalCertificateController,
  upsertMedicalCertificateController,
  addMultipleServicesController,
  getMultipleServicesController,
  getRemainingServicesController,
} from '../../controllers/appointment.controller';
import { cancelAppointmentController } from '../../../cancellation-policy/controllers/cancellationPolicy.controller';
import { requestCancellationSchema } from '../../../cancellation-policy/schemas/cancellationPolicy.schemas';
import {
  appointmentIdSchema,
  appointmentQuerySchema,
  clinicAppointmentDetailsQuerySchema,
  createAppointmentSchemas,
  doctorIdSchema,
  getAvailableSlotsForDateSchemas,
  getAvailableSlotsForParamsSchemas,
  patientIdSchema,
  updateAppointmentSchema,
  createNoShowPolicySchema,
  markNoShowSchema,
  getAppointmentPaymentsSchema,
  createPatientGallerySchema,
  getPatientGallerySchema,
  getDoctorGallerySchema,
  medicalCertificateSchema,
  addMultipleServicesSchema,
  sendManualPrescriptionNotificationSchema,
} from '../../schemas/appointment.schemas';
import { docsRegistry } from '../../../../utils/docsRegistry';
import {
  uploadConsentFile,
  uploadDoctorGallery,
  uploadDoctorManualPrescription,
  uploadPatientGallery,
} from '../../../../middlewear/upload.middleware';
import {
  enforceDateLimit,
  FEATURE_KEYS,
} from '../../../../middlewear/limitation.middleware';
import { getQueueStateController } from '../../../appointment-engine/controllers/queueState.controller';

const appointmentsRouter = express.Router();

/**
 * @route POST /api/v1/appointments/
 * @desc Create a new appointment for a patient
 * @access Private (Admin, Clinic)
 */

appointmentsRouter.post(
  '/add-patient-gallery',
  requireAuth,
  requireDoctor,
  uploadPatientGallery.single('imageUrl'),
  validate(createPatientGallerySchema, 'body'),
  createPatientGalleryController
);

appointmentsRouter.get(
  '/get-patient-gallery',
  requireAuth,
  validate(getPatientGallerySchema, 'query'),
  getPatientGalleryController
);

appointmentsRouter.delete(
  '/delete-patient-gallery/:id',
  requireAuth,
  requireDoctor,
  deletePatientGalleryController
);

appointmentsRouter.delete(
  '/delete-patient-gallery-of-appointment/:appointmentId',
  requireAuth,
  requireDoctor,
  deleteAppointmentGalleryController
);

appointmentsRouter.post(
  '/add-doctor-gallery',
  requireAuth,
  requireDoctor,
  uploadDoctorGallery.single('imageUrl'),
  createDoctorGalleryController
);

appointmentsRouter.get(
  '/get-doctor-gallery',
  requireAuth,
  requireDoctor,
  validate(getDoctorGallerySchema, 'query'),
  getDoctorGalleryController
);

appointmentsRouter.get(
  '/get-doctor-gallery-by-specialty',
  requireAuth,
  validate(getDoctorGallerySchema, 'query'),
  getDoctorGalleryBySpecialtyController
);

appointmentsRouter.delete(
  '/delete-doctor-gallery/:id',
  requireAuth,
  requireDoctor,
  deleteDoctorGalleryController
);

appointmentsRouter.get(
  '/payment-transactions',
  requireAuth,
  requireClinic,
  validate(getAppointmentPaymentsSchema, 'query'),
  enforceDateLimit(FEATURE_KEYS.PAYMENT_HISTORY_MONTHS),
  getAppointmentPaymentsController
);

appointmentsRouter.post(
  '/',
  requireAuth,
  requireAdmin,
  requireClinic,
  enforceClinicAutoLogout,
  validate(createAppointmentSchemas, 'body'),
  createAppointmentController
);

/**
 * @route PUT /api/v1/appointments/:appointmentId
 * @desc Update an existing appointment details
 * @access Private (Admin, Clinic)
 */
appointmentsRouter.put(
  '/:appointmentId',
  requireAuth,
  requireAdmin,
  requireClinic,
  validate(updateAppointmentSchema, 'body'),
  validate(appointmentIdSchema, 'params'),
  enforceClinicAutoLogout,
  updateAppointmentController
);

/**
 * @route POST /api/v1/appointments/:appointmentId/cancel
 * @desc Cancel appointment (Staff-initiated policy cancellation)
 * @access Private (Clinic)
 */
appointmentsRouter.post(
  '/:appointmentId/cancel',
  requireAuth,
  requireReceptionist,
  requireClinic,
  validate(requestCancellationSchema, 'body'),
  validate(appointmentIdSchema, 'params'),
  enforceClinicAutoLogout,
  cancelAppointmentController
);

appointmentsRouter.post(
  '/update-doctor-manual-prescription/:appointmentId',
  requireAuth,
  requireClinic,
  uploadDoctorManualPrescription.single('doctorManualPrescription'),
  validate(appointmentIdSchema, 'params'),
  upsertDoctorManualPrescriptionController
);

appointmentsRouter.post(
  '/:appointmentId/send-manual-prescription-notification',
  requireAuth,
  requireDoctor,
  validate(appointmentIdSchema, 'params'),
  validate(sendManualPrescriptionNotificationSchema, 'body'),
  sendManualPrescriptionLinkController
);

appointmentsRouter.put(
  '/consent/:appointmentId',
  requireAuth,
  uploadConsentFile.single('consentFile'),
  updateConsentFileController
);

/**
 * @route GET /api/v1/appointments/:appointmentId/history
 * @desc Get activity history for a specific appointment
 * @access Private (Auth)
 */
appointmentsRouter.get(
  '/:appointmentId/history',
  requireAuth,
  validate(appointmentIdSchema, 'params'),
  getAppointmentHistoryController
);

/**
 * @route GET /api/v1/appointments/all/clicnic
 * @desc Get all appointments associated with a specific clinic
 * @access Private (Receptionist, Clinic)
 */
appointmentsRouter.get(
  '/all/clicnic',
  requireAuth,
  requireReceptionist,
  requireClinic,
  validate(appointmentQuerySchema, 'query'),
  enforceDateLimit(FEATURE_KEYS.STORAGE_MONTHS),
  enforceClinicAutoLogout,
  getAllClinicAppointmentController
);

/**
 * @route GET /api/v1/appointments/details/clinic
 * @desc Get whole-day appointment status totals for a clinic
 * @access Private (Receptionist, Clinic)
 */
appointmentsRouter.get(
  '/details/clinic',
  requireAuth,
  requireReceptionist,
  requireClinic,
  validate(clinicAppointmentDetailsQuerySchema, 'query'),
  enforceDateLimit(FEATURE_KEYS.STORAGE_MONTHS),
  enforceClinicAutoLogout,
  getClinicAppointmentDetailsController
);

/**
 * @route GET /api/v1/appointments/all/user
 * @desc Get all appointments for the current user across clinics
 * @access Private (Admin, Clinic)
 */
appointmentsRouter.get(
  '/all/user',
  requireAuth,
  requireAdmin,
  requireClinic,
  validate(appointmentQuerySchema, 'query'),
  enforceDateLimit(FEATURE_KEYS.STORAGE_MONTHS),
  getAllUserAppointmentController
);

/**
 * @route GET /api/v1/appointments/queue-state
 * @desc Get real-time queue state (from Redis cache) for a doctor's daily queue
 * @query clinicId, doctorId, date (optional, defaults to today)
 * @access Private (Auth)
 */
appointmentsRouter.get(
  '/queue-state',
  requireAuth,
  requireClinic,
  getQueueStateController
);

/**
 * @route GET /api/v1/appointments/:appointmentId
 * @desc Get detailed information about a specific appointment by ID
 * @access Private (Receptionist, Clinic)
 */
appointmentsRouter.get(
  '/:appointmentId',
  requireAuth,
  requireReceptionist,
  requireClinic,
  validate(appointmentIdSchema, 'params'),
  getAppointmentController
);

appointmentsRouter.get(
  '/patient-last-details/:patientId',
  requireAuth,
  requireDoctor,
  requireClinic,
  validate(patientIdSchema, 'params'),
  getLastPatientReportCardController
);

/**
 * @route GET /api/v1/appointments/patient/:patientId
 * @desc Get all appointments for a specific patient
 * @access Private (Receptionist, Clinic)
 */
appointmentsRouter.get(
  '/patient/:patientId',
  requireAuth,
  requireReceptionist,
  requireClinic,
  validate(patientIdSchema, 'params'),
  enforceClinicAutoLogout,
  getPatientApppointmentController
);

/**
 * @route GET /api/v1/appointments/doctor/:doctorId
 * @desc Get all appointments for a specific doctor
 * @access Private (Receptionist, Clinic)
 */
appointmentsRouter.get(
  '/doctor/:doctorId',
  requireAuth,
  requireReceptionist,
  requireClinic,
  validate(doctorIdSchema, 'params'),
  getDcotorApppointmentController
);

/**
 * @route GET /api/v1/appointments/doctor/available/slot-date-clinic/:doctorId
 * @desc Get available time slots for a doctor on a specific date at a clinic
 * @access Private (Receptionist, Clinic)
 */
appointmentsRouter.get(
  '/doctor/available/slot-date-clinic/:doctorId',
  requireAuth,
  requireReceptionist,
  requireClinic,
  validate(getAvailableSlotsForParamsSchemas, 'params'),
  validate(getAvailableSlotsForDateSchemas, 'query'),
  getAvailableSlotsForDateController
);

/**
 * @route POST /api/v1/appointments/:appointmentId/no-show
 * @desc Mark an appointment as No Show
 * @access Private (Doctor, Receptionist, Clinic)
 */
appointmentsRouter.post(
  '/:appointmentId/no-show',
  requireAuth,
  requireClinic,
  validate(appointmentIdSchema, 'params'),
  validate(markNoShowSchema, 'body'),
  markAsNoShowController
);

/**
 * @route POST /api/v1/appointments/no-show/policy
 * @desc Set or update No Show policy for a clinic
 * @access Private (Admin, Clinic)
 */
appointmentsRouter.post(
  '/no-show/policy',
  requireAuth,
  requireAdmin,
  requireClinic,
  validate(createNoShowPolicySchema, 'body'),
  setNoShowPolicyController
);

/**
 * @route GET /api/v1/appointments/no-show/policy
 * @desc Get No Show policy for a clinic
 * @access Private (Admin, Clinic, Receptionist)
 */
appointmentsRouter.get(
  '/no-show/policy',
  requireAuth,
  requireClinic,
  getNoShowPolicyController
);

/**
 * @route GET /api/v1/appointments/no-show/history/patient/:patientId
 * @desc Get No Show history for a patient
 * @access Private (Doctor, Receptionist, Clinic)
 */
appointmentsRouter.get(
  '/no-show/history/patient/:patientId',
  requireAuth,
  requireClinic,
  validate(patientIdSchema, 'params'),
  getPatientNoShowHistoryController
);

/**
 * @route GET /api/v1/appointments/no-show/analytics/clinic
 * @desc Get No Show analytics for a clinic
 * @access Private (Admin, Clinic)
 */
appointmentsRouter.get(
  '/no-show/analytics/clinic',
  requireAuth,
  requireAdmin,
  requireClinic,
  getClinicNoShowAnalyticsController
);

appointmentsRouter.get(
  '/medical-certificate/:appointmentId',
  requireAuth,
  requireClinic,
  validate(appointmentIdSchema, 'params'),
  getMedicalCertificateController
);

appointmentsRouter.post(
  '/medical-certificate/:appointmentId',
  requireAuth,
  requireClinic,
  validate(appointmentIdSchema, 'params'),
  validate(medicalCertificateSchema, 'body'),
  upsertMedicalCertificateController
);

appointmentsRouter.post(
  '/multiple-service/:appointmentId',
  requireAuth,
  requireClinic,
  validate(appointmentIdSchema, 'params'),
  validate(addMultipleServicesSchema, 'body'),
  addMultipleServicesController
);

appointmentsRouter.get(
  '/multiple-service/:appointmentId',
  requireAuth,
  requireClinic,
  validate(appointmentIdSchema, 'params'),
  getMultipleServicesController
);

appointmentsRouter.get(
  '/get-remaining-service/:appointmentId',
  requireAuth,
  requireClinic,
  validate(appointmentIdSchema, 'params'),
  getRemainingServicesController
);

export default appointmentsRouter;

docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/appointments', // full path as it would appear in the app
  description: 'Create a appointments for a patient',
  requestSchema: createAppointmentSchemas,
  tags: ['appointments', 'Petient'],
});

docsRegistry.addEndpoint({
  method: 'put',
  path: '/api/v1/appointments/:appointmentId', // full path as it would appear in the app
  description: 'update a appointments for a patient',
  requestSchema: updateAppointmentSchema,
  params: appointmentIdSchema,
  tags: ['appointments', 'Petient'],
});
docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/appointments/:appointmentId/add-multiple-services',
  description: 'Add multiple services to an appointment',
  requestSchema: addMultipleServicesSchema,
  params: appointmentIdSchema,
  tags: ['appointments'],
});

docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/appointments/:appointmentId/multiple-services',
  description: 'Get multiple services for an appointment',
  params: appointmentIdSchema,
  tags: ['appointments'],
});

docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/appointments/all/clicnic', // full path as it would appear in the app
  description: 'Get all patient appointments by clinic',
  query: appointmentQuerySchema,
  tags: ['appointments', 'Clinic'],
});
docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/appointments/details/clinic',
  description: 'Get clinic appointment totals by selected date',
  query: clinicAppointmentDetailsQuerySchema,
  tags: ['appointments', 'Clinic'],
});
docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/appointments/all/user', // full path as it would appear in the app
  description: 'Get all patient appointments by user',
  query: appointmentQuerySchema,
  tags: ['appointments', 'user'],
});
docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/appointments/:appointmentId', // full path as it would appear in the app
  description: 'get appointment by id',
  params: appointmentIdSchema,
  tags: ['appointments', 'Petient'],
});
docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/appointments/patient/:patientId', // full path as it would appear in the app
  description: 'get  patientId  appointment by id',
  params: patientIdSchema,
  tags: ['appointments', 'Petient'],
});
docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/appointments/doctor/:doctorId', // full path as it would appear in the app
  description: 'get doctorId appointment by id',
  params: doctorIdSchema,
  tags: ['appointments', 'Petient'],
});

docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/appointments/doctor/available/slot-date-clinic/:doctorId', // full path as it would appear in the app
  description: 'get avlble slot for a date',
  params: getAvailableSlotsForParamsSchemas,
  query: getAvailableSlotsForDateSchemas,
  tags: ['appointments', 'Petient'],
});

docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/appointments/:appointmentId/no-show',
  description: 'Mark an appointment as No Show',
  params: appointmentIdSchema,
  requestSchema: markNoShowSchema,
  tags: ['appointments', 'NoShow'],
});

docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/appointments/no-show/policy',
  description: 'Set or update No Show policy for a clinic',
  requestSchema: createNoShowPolicySchema,
  tags: ['appointments', 'NoShow'],
});

docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/appointments/no-show/policy',
  description: 'Get No Show policy for a clinic',
  tags: ['appointments', 'NoShow'],
});

docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/appointments/no-show/history/patient/:patientId',
  description: 'Get No Show history for a patient',
  params: patientIdSchema,
  tags: ['appointments', 'NoShow'],
});

docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/appointments/no-show/analytics/clinic',
  description: 'Get No Show analytics for a clinic',
  tags: ['appointments', 'NoShow'],
});

docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/appointments/:appointmentId/send-manual-prescription-notification',
  description:
    'Send manual prescription upload link/notification to doctor mobile device',
  params: appointmentIdSchema,
  requestSchema: sendManualPrescriptionNotificationSchema,
  tags: ['appointments', 'Notification'],
});
