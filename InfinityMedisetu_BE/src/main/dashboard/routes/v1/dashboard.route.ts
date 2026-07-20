// src/main/dashboard/routes/v1/dashboard.route.ts
import express from 'express';
import { docsRegistry } from '../../../../utils/docsRegistry';
import {
  requireAdmin,
  requireAuth,
  requireClinic,
  requireRole,
  requireSuperAdmin,
  enforceClinicAutoLogout,
} from '../../../../middlewear/auth.middleware';
import {
  getDashboardController,
  getDoctorDashboardController,
  getSuperAdminDashboardController,
  getRevenueOverviewController,
  getTodayOverviewController,
} from '../../controllers/dashboard.controller';
import { validate } from '../../../../middlewear/validation.middleware';
import {
  dashboardDoctorQuerySchema,
  dashboardQuerySchema,
  revenueOverviewQuerySchema,
  superAdminDashboardQuerySchema,
  todayOverviewQuerySchema,
} from '../../schemas/dashboard.schemas';
import {
  enforceDateLimit,
  FEATURE_KEYS,
} from '../../../../middlewear/limitation.middleware';

const dashboardRouter = express.Router();

/**
 * @route GET /api/v1/dashboard/
 * @desc Get clinic dashboard statistics
 * @access Private (Admin, Clinic)
 */
dashboardRouter.get(
  '/',
  requireAuth,
  requireAdmin,
  requireClinic,
  enforceClinicAutoLogout,
  validate(dashboardQuerySchema, 'query'),
  enforceDateLimit(FEATURE_KEYS.STORAGE_MONTHS),
  getDashboardController
);

/**
 * @route GET /api/v1/dashboard/doctor
 * @desc Get doctor dashboard statistics
 * @access Private (Doctor, Admin — Admin can pass ?doctorId to view another doctor's data)
 */
dashboardRouter.get(
  '/doctor',
  requireAuth,
  requireRole(['Doctor', 'Admin']),
  requireClinic,
  enforceClinicAutoLogout,
  validate(dashboardDoctorQuerySchema, 'query'),
  enforceDateLimit(FEATURE_KEYS.STORAGE_MONTHS),
  getDoctorDashboardController
);

/**
 * @route GET /api/v1/dashboard/revenue-overview
 * @desc Get revenue overview (this month & this week)
 * @access Private (Admin sees all or specific doctor; Doctor sees only own)
 */
dashboardRouter.get(
  '/revenue-overview',
  requireAuth,
  requireRole(['Admin', 'Doctor']),
  requireClinic,
  enforceClinicAutoLogout,
  validate(revenueOverviewQuerySchema, 'query'),
  getRevenueOverviewController
);

/**
 * @route GET /api/v1/dashboard/today-overview
 * @desc Get today's revenue + appointment stats for a doctor
 * @access Private (Doctor sees own; Admin with doctor access can pass doctorId)
 */
dashboardRouter.get(
  '/today-overview',
  requireAuth,
  requireRole(['Admin', 'Doctor']),
  requireClinic,
  enforceClinicAutoLogout,
  validate(todayOverviewQuerySchema, 'query'),
  getTodayOverviewController
);

/**
 * @route GET /api/v1/dashboard/super-admin
 * @desc Get super admin dashboard statistics
 * @access Private (Super Admin only)
 */
dashboardRouter.get(
  '/super-admin',
  requireAuth,
  requireSuperAdmin,
  validate(superAdminDashboardQuerySchema, 'query'),
  getSuperAdminDashboardController
);

docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/dashboard/doctor',
  description: 'get doctor dashboard',
  query: dashboardDoctorQuerySchema,
  tags: ['dashboard'],
});

docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/dashboard',
  description: 'get dashboard',
  query: dashboardQuerySchema,
  tags: ['dashboard'],
});

docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/dashboard/patients',
  description: 'get dashboard',
  query: dashboardQuerySchema,
  tags: ['dashboard'],
});

docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/dashboard/revenue-overview',
  description: 'get revenue overview for this month and this week',
  query: revenueOverviewQuerySchema,
  tags: ['dashboard'],
});

docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/dashboard/today-overview',
  description: "get today's revenue and appointment stats for a doctor",
  query: todayOverviewQuerySchema,
  tags: ['dashboard'],
});

docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/dashboard/super-admin',
  description: 'get super admin dashboard with system-wide analytics',
  query: superAdminDashboardQuerySchema,
  tags: ['dashboard'],
});

export default dashboardRouter;
