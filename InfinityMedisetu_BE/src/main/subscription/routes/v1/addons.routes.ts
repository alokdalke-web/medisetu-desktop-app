import express from 'express';
import {
  requireAuth,
  requireClinic,
  requireSuperAdmin,
} from '../../../../middlewear/auth.middleware';
import { validate } from '../../../../middlewear/validation.middleware';
import { docsRegistry } from '../../../../utils/docsRegistry';
import {
  cancelAddOn,
  createAddOn,
  deleteAddOn,
  getActiveAddOns,
  getAddOnLimits,
  getAddOnPricing,
  getAllAddOns,
  getAvailableAddOns,
  getMyAddOns,
  purchaseAddOn,
  reduceAddOnQuantity,
  scheduleAddOnCancellation,
  undoAddOnCancellation,
  updateAddOn,
  verifyPurchase,
} from '../../controllers/addon.controller';
import {
  createAddOnSchema,
  updateAddOnSchema,
  initiatePurchaseSchema,
  verifyPurchaseSchema,
  addOnIdParamsSchema,
  clinicAddOnIdParamsSchema,
} from '../../schemas/addon.schemas';

const addonRouter = express.Router();

// ==================== Admin Routes ====================

/**
 * @route POST /api/v1/subscription/addons
 * @desc Create a new add-on
 * @access Private (Super Admin)
 */
addonRouter.post(
  '/',
  requireAuth,
  requireSuperAdmin,
  validate(createAddOnSchema, 'body'),
  createAddOn
);

/**
 * @route GET /api/v1/subscription/addons
 * @desc Get all add-ons (admin view)
 * @access Private (Super Admin)
 */
addonRouter.get('/', requireAuth, requireSuperAdmin, getAllAddOns);

/**
 * @route GET /api/v1/subscription/addons/active
 * @desc Get active add-ons
 * @access Private (Admin)
 */
addonRouter.get('/active', requireAuth, requireSuperAdmin, getActiveAddOns);

/**
 * @route PATCH /api/v1/subscription/addons/:id
 * @desc Update an add-on
 * @access Private (Super Admin)
 */
addonRouter.patch(
  '/:id',
  requireAuth,
  requireSuperAdmin,
  validate(addOnIdParamsSchema, 'params'),
  validate(updateAddOnSchema, 'body'),
  updateAddOn
);

/**
 * @route DELETE /api/v1/subscription/addons/:id
 * @desc Delete an add-on (soft delete)
 * @access Private (Super Admin)
 */
addonRouter.delete(
  '/:id',
  requireAuth,
  requireSuperAdmin,
  validate(addOnIdParamsSchema, 'params'),
  deleteAddOn
);

// ==================== Clinic Routes ====================

/**
 * @route GET /api/v1/subscription/addons/available
 * @desc Get available add-ons for purchase
 * @access Private (Clinic)
 */
addonRouter.get('/available', requireAuth, requireClinic, getAvailableAddOns);

/**
 * @route GET /api/v1/subscription/addons/pricing
 * @desc Get add-on pricing information
 * @access Private (Clinic)
 */
addonRouter.get('/pricing', requireAuth, requireClinic, getAddOnPricing);

/**
 * @route GET /api/v1/subscription/addons/my-addons
 * @desc Get clinic's purchased add-ons
 * @access Private (Clinic)
 */
addonRouter.get('/my-addons', requireAuth, requireClinic, getMyAddOns);

/**
 * @route GET /api/v1/subscription/addons/limits
 * @desc Get clinic's add-on limits breakdown
 * @access Private (Clinic)
 */
addonRouter.get('/limits', requireAuth, requireClinic, getAddOnLimits);

/**
 * @route POST /api/v1/subscription/addons/purchase
 * @desc Initiate add-on purchase
 * @access Private (Clinic)
 */
addonRouter.post(
  '/purchase',
  requireAuth,
  requireClinic,
  validate(initiatePurchaseSchema, 'body'),
  purchaseAddOn
);

/**
 * @route POST /api/v1/subscription/addons/verify-purchase
 * @desc Verify payment and complete add-on purchase
 * @access Private (Clinic)
 */
addonRouter.post(
  '/verify-purchase',
  requireAuth,
  requireClinic,
  validate(verifyPurchaseSchema, 'body'),
  verifyPurchase
);

/**
 * @route PUT /api/v1/subscription/addons/reduce-quantity/:clinicAddOnId
 * @desc Reduce the quantity of an active add-on
 * @access Private (Clinic)
 */
addonRouter.put(
  '/reduce-quantity/:clinicAddOnId',
  requireAuth,
  requireClinic,
  validate(clinicAddOnIdParamsSchema, 'params'),
  reduceAddOnQuantity
);

/**
 * @route PUT /api/v1/subscription/addons/cancel/:clinicAddOnId
 * @desc Cancel an add-on subscription (immediate)
 * @access Private (Clinic)
 */
addonRouter.put(
  '/cancel/:clinicAddOnId',
  requireAuth,
  requireClinic,
  validate(clinicAddOnIdParamsSchema, 'params'),
  cancelAddOn
);

/**
 * @route PUT /api/v1/subscription/addons/schedule-cancel/:clinicAddOnId
 * @desc Schedule add-on cancellation at end of billing period
 * @access Private (Clinic)
 */
addonRouter.put(
  '/schedule-cancel/:clinicAddOnId',
  requireAuth,
  requireClinic,
  validate(clinicAddOnIdParamsSchema, 'params'),
  scheduleAddOnCancellation
);

/**
 * @route PUT /api/v1/subscription/addons/undo-cancel/:clinicAddOnId
 * @desc Undo a scheduled add-on cancellation
 * @access Private (Clinic)
 */
addonRouter.put(
  '/undo-cancel/:clinicAddOnId',
  requireAuth,
  requireClinic,
  validate(clinicAddOnIdParamsSchema, 'params'),
  undoAddOnCancellation
);

export default addonRouter;

// ==================== API Documentation ====================

docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/subscription/addons',
  description: 'Create a new add-on (Super Admin)',
  requestSchema: createAddOnSchema,
  tags: ['addons', 'admin'],
});

docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/subscription/addons',
  description: 'Get all add-ons (Super Admin)',
  tags: ['addons', 'admin'],
});

docsRegistry.addEndpoint({
  method: 'patch',
  path: '/api/v1/subscription/addons/:id',
  description: 'Update an add-on (Super Admin)',
  params: addOnIdParamsSchema,
  requestSchema: updateAddOnSchema,
  tags: ['addons', 'admin'],
});

docsRegistry.addEndpoint({
  method: 'delete',
  path: '/api/v1/subscription/addons/:id',
  description: 'Delete an add-on (Super Admin)',
  params: addOnIdParamsSchema,
  tags: ['addons', 'admin'],
});

docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/subscription/addons/available',
  description: 'Get available add-ons for purchase',
  tags: ['addons', 'clinic'],
});

docsRegistry.addEndpoint({
  method: 'get',
  path: '/api/v1/subscription/addons/my-addons',
  description: 'Get clinic purchased add-ons',
  tags: ['addons', 'clinic'],
});

docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/subscription/addons/purchase',
  description: 'Initiate add-on purchase',
  requestSchema: initiatePurchaseSchema,
  tags: ['addons', 'purchase'],
});

docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/subscription/addons/verify-purchase',
  description: 'Verify payment and complete add-on purchase',
  requestSchema: verifyPurchaseSchema,
  tags: ['addons', 'purchase'],
});
