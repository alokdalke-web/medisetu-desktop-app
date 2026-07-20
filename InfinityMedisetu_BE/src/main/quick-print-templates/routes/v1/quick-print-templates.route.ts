import express from 'express';
import { requireAuth } from '../../../../middlewear/auth.middleware';
import { validate } from '../../../../middlewear/validation.middleware';
import {
  getQuickPrintTemplateController,
  saveQuickPrintTemplateController,
  previewQuickPrintTemplateController,
} from '../../controllers/quickPrintTemplate.controller';
import { saveQuickPrintTemplateSchema } from '../../schemas/quickPrintTemplate.schemas';

const quickPrintTemplatesRouter = express.Router();

/**
 * @route GET /api/v1/quick-print-templates/
 * @desc Get doctor's quick print template configuration
 * @access Private (authenticated user)
 */
quickPrintTemplatesRouter.get(
  '/',
  requireAuth,
  getQuickPrintTemplateController
);

/**
 * @route POST /api/v1/quick-print-templates/
 * @desc Save doctor's quick print template configuration
 * @access Private (authenticated user)
 */
quickPrintTemplatesRouter.post(
  '/',
  requireAuth,
  validate(saveQuickPrintTemplateSchema, 'body'),
  saveQuickPrintTemplateController
);

/**
 * @route POST /api/v1/quick-print-templates/preview
 * @desc Render live preview of quick print template with sample data
 * @access Private (authenticated user)
 */
quickPrintTemplatesRouter.post(
  '/preview',
  requireAuth,
  previewQuickPrintTemplateController
);

export default quickPrintTemplatesRouter;
