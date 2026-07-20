import { Request, Response } from 'express';
import { PrescriptionQueueService } from '../services/prescriptionQueue.service';
import { asyncHandler } from '../../../middlewear/errorHandler';
// import * as invoiceService from '../services/invoice.service';

export const updatePrescriptionStatusController = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.validatedParams as { id: string };
    const { status } = req.validatedBody as {
      status: 'PENDING' | 'ON_HOLD' | 'COMPLETED' | 'REJECTED';
    };
    // Assuming requireAuth sets req.user.id as pharmacyId
    const pharmacyUserId = req.user.id;
    const result = await PrescriptionQueueService.updateStatus(
      id,
      status,
      pharmacyUserId
    );

    res.json({
      success: true,
      message: 'Prescription status updated successfully',
      result,
    });
  }
);

export const getPrescriptionQueueListController = asyncHandler(
  async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = req.validatedQuery as any;
    const clinicId = req.clinicId;

    // If clinicId is not in req (e.g. admin or missing middleware), check query
    const targetClinicId = clinicId || query.clinicId;

    if (!targetClinicId) {
      res
        .status(400)
        .json({ success: false, message: 'Clinic ID is required' });
      return;
    }

    const result = await PrescriptionQueueService.getList({
      ...query,
      clinicId: targetClinicId,
    });

    res.json({
      success: true,
      result,
    });
  }
);

// export const getPrescriptionQueueDetailsController = asyncHandler(
//   async (req: Request, res: Response) => {
//     const { id } = req.validatedParams as { id: string };
//     const clinicId = req.clinicId;
//     const userId = req.user.id;

//     // Resolve pharmacyId for the current user
//     const pharmacyId = clinicId
//       ? await invoiceService.resolvePharmacyIdForUser(clinicId, userId)
//       : null;

//     if (!pharmacyId && req.user.userType === 'Pharmacist') {
//       res.status(403).json({
//         success: false,
//         message: 'You are not assigned to any pharmacy in this clinic',
//       });
//       return;
//     }

//     const result = await PrescriptionQueueService.getDetails(
//       id,
//       pharmacyId ?? undefined
//     );

//     if (!result) {
//       res.status(404).json({
//         success: false,
//         message: 'Prescription queue entry not found',
//       });
//       return;
//     }

//     res.json({
//       success: true,
//       result,
//     });
//   }
// );
