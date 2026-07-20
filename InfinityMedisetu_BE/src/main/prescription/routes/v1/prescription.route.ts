import express from 'express';
import {
  getDummyPrescription,
  scanPrescription,
} from '../../controllers/prescription.controller';
import {
  createScanSession,
  getScanStatus,
  uploadScanViaOtp,
} from '../../controllers/scan.bridge.controller';
import {
  requireAuth,
  requireDoctor,
} from '../../../../middlewear/auth.middleware';
import geminiAutoAlignRouter from '../../services/gemini-auto-align.route';

const prescriptionRouter = express.Router();

prescriptionRouter.get(
  '/dummy',
  requireAuth,
  // requireDoctor,
  getDummyPrescription
);

prescriptionRouter.post(
  '/scan',
  requireAuth,
  requireDoctor,
  scanPrescription,
  express.json({ limit: '12mb' })
);

prescriptionRouter.post(
  '/scan/session',
  requireAuth,
  // requireDoctor,
  createScanSession
);

prescriptionRouter.post(
  '/scan/upload',
  // requireAuth,
  // requireDoctor,
  uploadScanViaOtp,
  express.json({ limit: '12mb' })
);

prescriptionRouter.get(
  '/scan/status',
  // requireAuth,
  // requireDoctor,
  getScanStatus
);

prescriptionRouter.use(
  '/auto-align',
  requireAuth,
  geminiAutoAlignRouter,
  express.json({ limit: '12mb' })
);

export default prescriptionRouter;
