import { Request, Response } from 'express';
import { AddOnService, ADD_ON_PRICING } from '../services/addon.service';
import { asyncHandler, HttpError } from '../../../middlewear/errorHandler';
import { sendOk, sendCreated } from '../../../utils/response.utils';
import { envConfig } from '../../../utils/envConfig';
import { database } from '../../../configurations/dbConnection';
import {
  AddOnModel,
  type AddOn,
  type ClinicAddOn,
} from '../models/addon.model';
import { eq } from 'drizzle-orm';
import { verifyRazorpayPayment } from '../../../utils/razorpay';
import { couponService } from '../services/coupon.service';

// ==================== Admin Controllers ====================

/**
 * Create a new add-on
 * POST /api/v1/users/addons
 */
export const createAddOn = asyncHandler(async (req: Request, res: Response) => {
  const addOn = await AddOnService.createAddOn(req.validatedBody);
  return sendCreated(res, 'Add-on created successfully', addOn);
});

/**
 * Get all add-ons (admin view)
 * GET /api/v1/users/addons
 */
export const getAllAddOns = asyncHandler(
  async (_req: Request, res: Response) => {
    const addOns = await AddOnService.getAllAddOns();
    return sendOk(res, 'Add-ons fetched successfully', addOns);
  }
);

/**
 * Get active add-ons
 * GET /api/v1/users/addons/active
 */
export const getActiveAddOns = asyncHandler(
  async (_req: Request, res: Response) => {
    const addOns = await AddOnService.getActiveAddOns();
    return sendOk(res, 'Active add-ons fetched successfully', addOns);
  }
);

/**
 * Update an add-on
 * PATCH /api/v1/users/addons/:id
 */
export const updateAddOn = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.validatedParams;
  const addOn = await AddOnService.updateAddOn(id, req.validatedBody);
  return sendOk(res, 'Add-on updated successfully', addOn);
});

/**
 * Delete an add-on (soft delete)
 * DELETE /api/v1/users/addons/:id
 */
export const deleteAddOn = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.validatedParams;
  const addOn = await AddOnService.deleteAddOn(id);
  return sendOk(res, 'Add-on deleted successfully', addOn);
});

// ==================== Clinic Controllers ====================

/**
 * Get available add-ons for purchase
 * GET /api/v1/users/addons/available
 */
export const getAvailableAddOns = asyncHandler(
  async (_req: Request, res: Response) => {
    const addOns = await AddOnService.getAvailableAddOns();

    // Get pricing info
    const addOnsWithPricing = addOns.map((addOn: AddOn) => ({
      ...addOn,
      pricing:
        ADD_ON_PRICING[addOn.featureKey as keyof typeof ADD_ON_PRICING] || null,
    }));

    return sendOk(
      res,
      'Available add-ons fetched successfully',
      addOnsWithPricing
    );
  }
);

/**
 * Get clinic's purchased add-ons
 * GET /api/v1/users/addons/my-addons
 */
export const getMyAddOns = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = req.clinicId;

  if (!clinicId) {
    throw new HttpError(400, 'Clinic context required');
  }

  const addOns = await AddOnService.getClinicAddOns(clinicId);

  // Get detailed info for each
  const detailedAddOns = await Promise.all(
    addOns.map(async (clinicAddOn: ClinicAddOn) => {
      const [addOn] = await database
        .select()
        .from(AddOnModel)
        .where(eq(AddOnModel.id, clinicAddOn.addOnId))
        .limit(1);

      return {
        ...clinicAddOn,
        addOn: addOn || null,
        isExpired: clinicAddOn.expiresAt
          ? new Date(clinicAddOn.expiresAt) < new Date()
          : false,
      };
    })
  );

  return sendOk(res, 'Your add-ons fetched successfully', detailedAddOns);
});

/**
 * Initiate add-on purchase
 * POST /api/v1/subscription/addons/purchase
 */
export const purchaseAddOn = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;

    if (!clinicId) {
      throw new HttpError(400, 'Clinic context required');
    }

    const { addOns, couponCode } = req.validatedBody;

    const result = await AddOnService.initiateAddOnPurchase(clinicId, addOns);

    // Apply coupon if provided
    let discountInfo: {
      couponId: number;
      couponCode: string;
      discountAmount: number;
      originalAmount: number;
      finalAmount: number;
    } | null = null;

    let finalAmount = result.amount;

    if (couponCode) {
      // Use the first addOn ID for coupon applicability check
      const firstAddOnId = addOns[0]?.addOnId || undefined;

      const couponResult = await couponService.applyCoupon({
        code: couponCode,
        clinicId,
        orderValue: result.amount,
        addOnId: firstAddOnId,
        billingCycle: addOns[0]?.billingCycle,
      });

      if (!couponResult.success || !couponResult.data) {
        throw new HttpError(400, couponResult.error || 'Invalid coupon code');
      }

      discountInfo = {
        couponId: couponResult.data.couponId,
        couponCode: couponResult.data.couponCode,
        discountAmount: couponResult.data.discountAmount,
        originalAmount: result.amount,
        finalAmount: couponResult.data.finalAmount,
      };

      finalAmount = couponResult.data.finalAmount;
    }

    return sendOk(res, 'Add-on purchase initiated', {
      orderId: result.orderId,
      amount: finalAmount,
      currency: result.currency,
      keyId: envConfig.RAZORPAY_KEY_ID,
      addOns: result.addOns,
      discount: discountInfo
        ? {
            couponCode: discountInfo.couponCode,
            couponId: discountInfo.couponId,
            discountAmount: discountInfo.discountAmount,
            originalAmount: discountInfo.originalAmount,
            finalAmount: discountInfo.finalAmount,
          }
        : undefined,
    });
  }
);

/**
 * Verify payment and complete add-on purchase
 * POST /api/v1/subscription/addons/verify-purchase
 */
export const verifyPurchase = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;

    if (!clinicId) {
      throw new HttpError(400, 'Clinic context required');
    }

    const {
      orderId,
      paymentId,
      signature,
      addOns,
      couponId,
      originalAmount,
      discountAmount,
    } = req.validatedBody;

    // Verify payment signature
    const isValid = verifyRazorpayPayment(orderId, paymentId, signature);
    if (!isValid) {
      throw new HttpError(400, 'Invalid payment signature');
    }

    // Complete the purchase for all add-ons
    const result = await AddOnService.completePurchase(
      clinicId,
      addOns,
      paymentId,
      orderId
    );

    // Record coupon usage if coupon was applied
    if (couponId && originalAmount && discountAmount) {
      const firstAddOnId = addOns[0]?.addOnId || undefined;

      await couponService.recordUsage({
        couponId: parseInt(couponId),
        clinicId,
        addOnId: firstAddOnId,
        orderValue: parseFloat(originalAmount),
        discountAmount: parseFloat(discountAmount),
        finalAmount: parseFloat(originalAmount) - parseFloat(discountAmount),
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        billingCycle: addOns[0]?.billingCycle,
      });
    }

    return sendOk(res, 'Add-ons purchased successfully', result);
  }
);

/**
 * Reduce quantity of an active add-on
 * PUT /api/v1/subscription/addons/reduce-quantity/:clinicAddOnId
 */
export const reduceAddOnQuantity = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    const { clinicAddOnId } = req.validatedParams;

    if (!clinicId) {
      throw new HttpError(400, 'Clinic context required');
    }

    const reduceBy = req.body?.reduceBy ?? 1;

    const result = await AddOnService.reduceAddOnQuantity(
      clinicAddOnId,
      clinicId,
      reduceBy
    );

    const message = result.removed
      ? 'Add-on removed completely'
      : `Add-on quantity reduced to ${result.quantity}`;

    return sendOk(res, message, result);
  }
);

/**
 * Schedule add-on cancellation at end of billing period
 * PUT /api/v1/subscription/addons/schedule-cancel/:clinicAddOnId
 */
export const scheduleAddOnCancellation = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    const { clinicAddOnId } = req.validatedParams;

    if (!clinicId) {
      throw new HttpError(400, 'Clinic context required');
    }

    const reason = req.body?.reason;

    const result = await AddOnService.scheduleCancelAddOn(
      clinicAddOnId,
      clinicId,
      reason
    );

    return sendOk(
      res,
      'Add-on will be cancelled at end of current billing period',
      result
    );
  }
);

/**
 * Undo scheduled add-on cancellation
 * PUT /api/v1/subscription/addons/undo-cancel/:clinicAddOnId
 */
export const undoAddOnCancellation = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    const { clinicAddOnId } = req.validatedParams;

    if (!clinicId) {
      throw new HttpError(400, 'Clinic context required');
    }

    const result = await AddOnService.undoCancelAddOn(clinicAddOnId, clinicId);

    return sendOk(res, 'Add-on cancellation has been reversed', result);
  }
);

/**
 * Cancel an add-on subscription (immediate)
 * PUT /api/v1/users/addons/cancel/:clinicAddOnId
 */
export const cancelAddOn = asyncHandler(async (req: Request, res: Response) => {
  const { clinicAddOnId } = req.validatedParams;

  const result = await AddOnService.cancelAddOn(clinicAddOnId);

  return sendOk(res, 'Add-on cancelled successfully', result);
});

/**
 * Get clinic's add-on limits breakdown
 * GET /api/v1/users/addons/limits
 */
export const getAddOnLimits = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;

    if (!clinicId) {
      throw new HttpError(400, 'Clinic context required');
    }

    const limits = await AddOnService.getClinicAddOnLimits(clinicId);

    return sendOk(res, 'Add-on limits fetched successfully', limits);
  }
);

/**
 * Get add-on pricing info
 * GET /api/v1/users/addons/pricing
 */
export const getAddOnPricing = asyncHandler(
  async (_req: Request, res: Response) => {
    return sendOk(res, 'Add-on pricing fetched successfully', ADD_ON_PRICING);
  }
);
