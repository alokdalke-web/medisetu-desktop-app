// src/main/reports/routes/v1/reports.route.ts
import express from 'express';
import {
  requireAdmin,
  requireAuth,
  requireClinic,
  requireDoctor,
} from '../../../../middlewear/auth.middleware';
import { validate } from '../../../../middlewear/validation.middleware';
import {
  createPatientReportCardController,
  createReportController,
  deleteFavouritePrescriptionController,
  getAllClinicReportController,
  getAppoinmentsPrescriptionsReportController,
  getCurrentTemplateController,
  getFavouritePrescriptionController,
  getPrescriptionTemplateController,
  getPreviewPrescriptionTemplateController,
  getReportCardController,
  getReportController,
  updatePatientReportCardController,
  updateReportController,
  upsertPrescriptionTemplateController,
} from '../../controllers/report.controller';
import {
  createReportAndPrescriptionsSchemas,
  createReportSchema,
  getAllReportsParamSchema,
  getAllReportsQuerySchema,
  getPatientIdParamsSchema,
  getPatientIdQuerySchema,
  getReportIdsQuerySchema,
  getReportCardIdQuerySchema,
  getReportsParamSchema,
  updateReportAndPrescriptionsSchemas,
  updateReportSchema,
  prescriptionTemplateSchema,
  doctorIdSchema,
  favouritePrescriptionIdSchema,
} from '../../schemas/report.schemas';
import { docsRegistry } from '../../../../utils/docsRegistry';

const reportRouter = express.Router();

/**
 * @route POST /api/v1/reports/
 * @desc Create a new diagnostic report
 * @access Private (Admin, Clinic)
 */

reportRouter.post(
  '/prescription-template',
  requireAuth,
  requireDoctor,
  validate(prescriptionTemplateSchema, 'body'),
  upsertPrescriptionTemplateController
);

reportRouter.get(
  '/prescription-template',
  requireAuth,
  requireDoctor,
  getPrescriptionTemplateController
);

reportRouter.post(
  '/preview-prescription-template',
  requireAuth,
  requireDoctor,
  getPreviewPrescriptionTemplateController
);

reportRouter.post(
  '/',
  requireAuth,
  requireAdmin,
  requireClinic,
  validate(createReportSchema, 'body'),
  createReportController
);

/**
 * @route PUT /api/v1/reports/:reportId
 * @desc Update an existing diagnostic report
 * @access Private (Admin, Clinic)
 */
reportRouter.put(
  '/:reportId',
  requireAuth,
  requireAdmin,
  requireClinic,
  validate(getReportsParamSchema, 'params'),
  validate(updateReportSchema, 'body'),
  updateReportController
);

/**
 * @route GET /api/v1/reports/all/:petientId
 * @desc Get all reports for a specific patient in the clinic
 * @access Private (Admin, Clinic)
 */
reportRouter.get(
  '/all/:petientId',
  requireAuth,
  requireAdmin,
  requireClinic,
  validate(getAllReportsParamSchema, 'params'),
  validate(getAllReportsQuerySchema, 'query'),
  getAllClinicReportController
);

/**
 * @route GET /api/v1/reports/:reportId
 * @desc Get details of a specific report by ID
 * @access Private (Admin, Clinic)
 */
reportRouter.get(
  '/:reportId',
  requireAuth,
  requireAdmin,
  requireClinic,
  validate(getReportsParamSchema, 'params'),
  getReportController
);

/**
 * @route POST /api/v1/reports/card
 * @desc Create a patient report card (multiple reports and prescriptions)
 * @access Private (Admin, Clinic)
 */
reportRouter.post(
  '/card',
  requireAuth,
  requireClinic,
  validate(createReportAndPrescriptionsSchemas, 'body'),
  createPatientReportCardController
);

reportRouter.get(
  '/template-info/current',
  requireAuth,
  requireClinic,
  getCurrentTemplateController
);

reportRouter.get(
  '/favourite-prescription/:doctorId',
  requireAuth,
  requireClinic,
  validate(doctorIdSchema, 'params'),
  getFavouritePrescriptionController
);

reportRouter.delete(
  '/delete-favourite-prescription/:id',
  requireAuth,
  requireClinic,
  validate(favouritePrescriptionIdSchema, 'params'),
  deleteFavouritePrescriptionController
);

/**
 * @route PUT /api/v1/reports/card/update
 * @desc Update an existing patient report card
 * @access Private (Admin, Clinic)
 */
reportRouter.put(
  '/card/update',
  requireAuth,
  requireAdmin,
  requireClinic,
  validate(updateReportAndPrescriptionsSchemas, 'body'),
  validate(getReportCardIdQuerySchema, 'query'),
  updatePatientReportCardController
);

/**
 * @route GET /api/v1/reports/card/all/:patientId
 * @desc Get all report cards and prescriptions for a specific patient
 * @access Private (Admin, Clinic)
 */
reportRouter.get(
  '/card/all/:patientId',
  requireAuth,
  requireAdmin,
  requireClinic,
  validate(getPatientIdParamsSchema, 'params'),
  validate(getPatientIdQuerySchema, 'query'),
  getAppoinmentsPrescriptionsReportController
);

reportRouter.get(
  '/card/appointments-reports',
  requireAuth,
  requireAdmin,
  requireClinic,
  validate(getReportIdsQuerySchema, 'query'),
  getReportCardController
);

export default reportRouter;

docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/reports', // full path as it would appear in the app
  description: 'Create a reports for a patient',
  requestSchema: createReportSchema,
  tags: ['reports', 'Petient'],
});
docsRegistry.addEndpoint({
  method: 'put',
  path: '/api/v1/reports', // full path as it would appear in the app
  description: 'update a Reports for a patient',
  requestSchema: updateReportSchema,
  params: getReportsParamSchema,
  tags: ['reports', 'Petient'],
});
docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/reports/:petientId', // full path as it would appear in the app
  description: 'get all the a Reports for a patient',
  query: getAllReportsQuerySchema,
  params: getAllReportsParamSchema,
  tags: ['reports', 'Petient'],
});
docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/reports/:reportId', // full path as it would appear in the app
  description: 'get a Reports for a patient',
  params: getReportsParamSchema,
  tags: ['reports', 'Petient'],
});
docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/reports/card', // full path as it would appear in the app
  description: 'create a report card for a patient',
  requestSchema: createReportAndPrescriptionsSchemas,
  tags: ['reports', 'Petient'],
});
docsRegistry.addEndpoint({
  method: 'put',
  path: '/api/v1/reports/card/update', // full path as it would appear in the app
  description: 'update a report card for a patient',
  requestSchema: updateReportAndPrescriptionsSchemas,
  query: getReportCardIdQuerySchema,
  tags: ['reports', 'Petient'],
});
docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/reports/card/all/:patientId', // full path as it would appear in the app
  description: 'get a report card for a patient',
  params: getPatientIdParamsSchema,
  query: getPatientIdQuerySchema,
  tags: ['reports', 'Patient'],
});
docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/reports/card/appointments-reports', // full path as it would appear in the app
  description: 'get a report card for a patient',
  query: getReportIdsQuerySchema,
  tags: ['reports', 'Patient'],
});
