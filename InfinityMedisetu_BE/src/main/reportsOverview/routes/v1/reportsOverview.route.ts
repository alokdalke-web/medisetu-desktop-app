import express from 'express';
import {
  requireAuth,
  requireClinic,
  requireRole,
} from '../../../../middlewear/auth.middleware';
import { validate } from '../../../../middlewear/validation.middleware';
import {
  reportsOverviewQuerySchema,
  reportsOverviewTrendQuerySchema,
} from '../../schemas/reportsOverview.schemas';
import {
  reportsPatientsQuerySchema,
  reportsPatientsTrendQuerySchema,
} from '../../schemas/reportsPatients.schemas';
import {
  reportsAppointmentsQuerySchema,
  reportsAppointmentsTrendQuerySchema,
} from '../../schemas/reportsAppointments.schemas';
import {
  getReportsOverviewController,
  getReportsOverviewTrendController,
} from '../../controllers/reportsOverview.controller';
import {
  getReportsPatientsController,
  getReportsPatientsTrendController,
} from '../../controllers/reportsPatients.controller';
import {
  getReportsAppointmentsController,
  getReportsAppointmentsTrendController,
} from '../../controllers/reportsAppointments.controller';
import { docsRegistry } from '../../../../utils/docsRegistry';

const reportsOverviewRouter = express.Router();

/**
 * @route GET /api/v1/reports-overview
 * @desc Get all reports overview data in a single consolidated response
 * @access Private (Admin only)
 */
reportsOverviewRouter.get(
  '/',
  requireAuth,
  requireRole(['Admin', 'Super_Admin']),
  requireClinic,
  validate(reportsOverviewQuerySchema, 'query'),
  getReportsOverviewController
);

/**
 * @route GET /api/v1/reports-overview/trend
 * @desc Get trend chart data for a specific type and period
 * @access Private (Admin only)
 */
reportsOverviewRouter.get(
  '/trend',
  requireAuth,
  requireRole(['Admin', 'Super_Admin']),
  requireClinic,
  validate(reportsOverviewTrendQuerySchema, 'query'),
  getReportsOverviewTrendController
);

/**
 * @route GET /api/v1/reports-overview/patients
 * @desc Get all patient report data in a single consolidated response
 * @access Private (Admin only)
 */
reportsOverviewRouter.get(
  '/patients',
  requireAuth,
  requireRole(['Admin', 'Super_Admin']),
  requireClinic,
  validate(reportsPatientsQuerySchema, 'query'),
  getReportsPatientsController
);

/**
 * @route GET /api/v1/reports-overview/patients/trend
 * @desc Get patient trend chart data for a specific type and period
 * @access Private (Admin only)
 */
reportsOverviewRouter.get(
  '/patients/trend',
  requireAuth,
  requireRole(['Admin', 'Super_Admin']),
  requireClinic,
  validate(reportsPatientsTrendQuerySchema, 'query'),
  getReportsPatientsTrendController
);

/**
 * @route GET /api/v1/reports-overview/appointments
 * @desc Get all appointment report data in a single consolidated response
 * @access Private (Admin only)
 */
reportsOverviewRouter.get(
  '/appointments',
  requireAuth,
  requireRole(['Admin', 'Super_Admin']),
  requireClinic,
  validate(reportsAppointmentsQuerySchema, 'query'),
  getReportsAppointmentsController
);

/**
 * @route GET /api/v1/reports-overview/appointments/trend
 * @desc Get appointment trend chart data
 * @access Private (Admin only)
 */
reportsOverviewRouter.get(
  '/appointments/trend',
  requireAuth,
  requireRole(['Admin', 'Super_Admin']),
  requireClinic,
  validate(reportsAppointmentsTrendQuerySchema, 'query'),
  getReportsAppointmentsTrendController
);

export default reportsOverviewRouter;

// ─── API Documentation ─────────────────────────────────────────────────────────

docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/reports-overview',
  description:
    'Get all reports overview data (metrics, trends, distributions, alerts) in one call',
  query: reportsOverviewQuerySchema,
  tags: ['Reports Overview', 'Analytics'],
});

docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/reports-overview/trend',
  description:
    'Get trend chart data for appointments or prescriptions with configurable period',
  query: reportsOverviewTrendQuerySchema,
  tags: ['Reports Overview', 'Analytics'],
});

docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/reports-overview/patients',
  description:
    'Get all patient report data (metrics, demographics, trends, growth) in one call',
  query: reportsPatientsQuerySchema,
  tags: ['Reports Patients', 'Analytics'],
});

docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/reports-overview/patients/trend',
  description:
    'Get patient trend chart data for patients or newVsReturning with configurable period',
  query: reportsPatientsTrendQuerySchema,
  tags: ['Reports Patients', 'Analytics'],
});

docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/reports-overview/appointments',
  description:
    'Get all appointment report data (metrics, status, time slots, doctors) in one call',
  query: reportsAppointmentsQuerySchema,
  tags: ['Reports Appointments', 'Analytics'],
});

docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/reports-overview/appointments/trend',
  description:
    'Get appointment trend chart data for appointments, byDay, timeSlots, or doctors',
  query: reportsAppointmentsTrendQuerySchema,
  tags: ['Reports Appointments', 'Analytics'],
});
