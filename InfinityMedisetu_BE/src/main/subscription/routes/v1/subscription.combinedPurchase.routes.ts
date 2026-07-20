import express from 'express';
import {
  requireAuth,
  requireClinic,
} from '../../../../middlewear/auth.middleware';
import { validate } from '../../../../middlewear/validation.middleware';
import { docsRegistry } from '../../../../utils/docsRegistry';
import {
  previewCombinedPrice,
  subscribeWithAddOns,
  verifyCombinedPurchase,
} from '../../controllers/combinedPurchase.controller';
import {
  subscribeWithAddOnsSchema,
  verifyCombinedPurchaseSchema,
} from '../../schemas/combinedPurchase.schemas';

const combinedPurchaseRouter = express.Router();

/**
 * @route POST /api/v1/subscription/subscribe-with-addons
 * @desc Subscribe to plan with optional add-ons (ONE API CALL)
 * @access Private (Clinic)
 */
combinedPurchaseRouter.post(
  '/subscribe-with-addons',
  requireAuth,
  requireClinic,
  validate(subscribeWithAddOnsSchema, 'body'),
  subscribeWithAddOns
);

/**
 * @route POST /api/v1/subscription/verify-combined-purchase
 * @desc Verify payment and activate subscription + add-ons
 * @access Private (Clinic)
 */
combinedPurchaseRouter.post(
  '/verify-combined-purchase',
  requireAuth,
  requireClinic,
  validate(verifyCombinedPurchaseSchema, 'body'),
  verifyCombinedPurchase
);

/**
 * @route POST /api/v1/subscription/preview-combined-price
 * @desc Preview pricing without creating order
 * @access Private (Clinic)
 */
combinedPurchaseRouter.post(
  '/preview-combined-price',
  requireAuth,
  requireClinic,
  validate(subscribeWithAddOnsSchema, 'body'),
  previewCombinedPrice
);

export default combinedPurchaseRouter;

docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/subscription/subscribe-with-addons',
  description: 'Subscribe to plan with add-ons in one call',
  requestSchema: subscribeWithAddOnsSchema,
  tags: ['subscription', 'add-ons', 'purchase'],
});

docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/subscription/verify-combined-purchase',
  description: 'Verify combined subscription + add-ons purchase',
  requestSchema: verifyCombinedPurchaseSchema,
  tags: ['subscription', 'add-ons', 'purchase'],
});

docsRegistry.addEndpoint({
  method: 'post',
  path: '/api/v1/subscription/preview-combined-price',
  description: 'Preview combined pricing',
  requestSchema: subscribeWithAddOnsSchema,
  tags: ['subscription', 'add-ons', 'pricing'],
});
