import { Request, Response } from 'express';
import { asyncHandler, HttpError } from '../../../middlewear/errorHandler';
import { sendOk, sendCreated } from '../../../utils/response.utils';
import { envConfig } from '../../../utils/envConfig';
import { database } from '../../../configurations/dbConnection';
import { SubscriptionService } from '../services/subscription.service';
import {
  SubscriptionPlanModel,
  ClinicSubscriptionModel,
} from '../models/subscription.model';
import { AddOnModel, ClinicAddOnModel } from '../models/addon.model';
import { eq } from 'drizzle-orm';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from '../../../utils/razorpay';

// ==========================================
// COMBINED SUBSCRIPTION + ADD-ONS PURCHASE
// ==========================================

/**
 * Subscribe to plan with optional add-ons in ONE API call
 * POST /api/v1/subscription/subscribe-with-addons
 */
export const subscribeWithAddOns = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    const { planId, billingCycle = 'monthly', addOns = [] } = req.validatedBody;

    if (!clinicId) {
      throw new HttpError(400, 'Clinic context required');
    }

    // Get plan details
    const plan = await database
      .select()
      .from(SubscriptionPlanModel)
      .where(eq(SubscriptionPlanModel.id, planId))
      .limit(1)
      .then((res) => res[0]);

    if (!plan) {
      throw new HttpError(404, 'Plan not found');
    }

    // Calculate subscription price
    const subscriptionPrice =
      billingCycle === 'yearly'
        ? Math.round(Number(plan.price) * 12 * 0.9)
        : Number(plan.price);

    // Calculate add-ons total
    let addOnsTotal = 0;
    const addOnDetails = [];

    for (const addOnItem of addOns) {
      const [addOn] = await database
        .select()
        .from(AddOnModel)
        .where(eq(AddOnModel.id, addOnItem.addOnId))
        .limit(1);

      if (!addOn || !addOn.isActive) {
        throw new HttpError(
          400,
          `Invalid or inactive add-on: ${addOnItem.addOnId}`
        );
      }

      const unitPrice =
        billingCycle === 'yearly'
          ? Number(addOn.yearlyPrice)
          : Number(addOn.monthlyPrice);

      const totalPrice = unitPrice * addOnItem.quantity;
      addOnsTotal += totalPrice;

      addOnDetails.push({
        addOnId: addOn.id,
        name: addOn.name,
        featureKey: addOn.featureKey,
        unitPrice,
        quantity: addOnItem.quantity,
        totalPrice,
        billingCycle,
      });
    }

    const grandTotal = subscriptionPrice + addOnsTotal;

    // Free plan with no add-ons - create subscription directly
    if (plan.slug === 'Free' && addOns.length === 0) {
      const sub = await SubscriptionService.subscribeClinic({
        clinicId,
        planId,
        provider: 'manual',
        providerSubscriptionId: 'free_plan',
        paymentMode: 'free',
        paymentStatus: 'success',
      });

      return sendCreated(res, 'Free subscription activated', {
        subscription: sub,
        addOns: [],
        totalAmount: 0,
      });
    }

    // Free plan CANNOT have add-ons (must have paid subscription)
    if (plan.slug === 'Free' && addOns.length > 0) {
      throw new HttpError(
        400,
        'Free plan cannot have add-ons. Please upgrade to a paid plan first.'
      );
    }

    // Create combined Razorpay order
    const order = await createRazorpayOrder(
      grandTotal,
      clinicId,
      planId,
      billingCycle
    );

    // Store purchase intent in cache (to retrieve during verification)
    const purchaseIntent = {
      clinicId,
      planId,
      billingCycle,
      subscriptionPrice,
      addOns: addOnDetails,
      addOnsTotal,
      grandTotal,
    };

    // Cache for 30 minutes (order expiry)
    const redisClient = (await import('../../../configurations/redisConfig'))
      .default;
    await redisClient.setex(
      `purchase_intent:${order.id}`,
      1800, // 30 minutes
      JSON.stringify(purchaseIntent)
    );

    return sendOk(res, 'Payment order created', {
      requiresPayment: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: envConfig.RAZORPAY_KEY_ID,
      breakdown: {
        plan: {
          id: plan.id,
          name: plan.name,
          billingCycle,
          price: subscriptionPrice,
        },
        addOns: addOnDetails,
        subscriptionPrice,
        addOnsTotal,
        grandTotal,
      },
    });
  }
);

/**
 * Verify combined subscription + add-ons purchase
 * POST /api/v1/subscription/verify-combined-purchase
 */
export const verifyCombinedPurchase = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    const {
      orderId,
      paymentId,
      signature,
      planId,
      billingCycle = 'monthly',
      addOns = [],
    } = req.validatedBody;

    if (!clinicId) {
      throw new HttpError(400, 'Clinic context required');
    }

    // Verify payment signature
    const isValid = verifyRazorpayPayment(orderId, paymentId, signature);
    if (!isValid) {
      throw new HttpError(400, 'Invalid payment signature');
    }

    // Check for duplicate subscription
    const existingSubscription = await database
      .select()
      .from(ClinicSubscriptionModel)
      .where(eq(ClinicSubscriptionModel.transactionId, paymentId))
      .limit(1);

    if (existingSubscription.length > 0) {
      return sendOk(res, 'Subscription already activated', {
        subscription: existingSubscription[0],
      });
    }

    // Deactivate existing subscriptions
    await database
      .update(ClinicSubscriptionModel)
      .set({
        active: false,
        updatedAt: new Date(),
      })
      .where(eq(ClinicSubscriptionModel.clinicId, clinicId));

    // Get plan
    const plan = await database
      .select()
      .from(SubscriptionPlanModel)
      .where(eq(SubscriptionPlanModel.id, planId))
      .limit(1)
      .then((res) => res[0]);

    if (!plan) {
      throw new HttpError(404, 'Plan not found');
    }

    // Calculate subscription price
    const subscriptionPrice =
      billingCycle === 'yearly'
        ? Math.round(Number(plan.price) * 12 * 0.9)
        : Number(plan.price);

    // Create subscription
    const [subscription] = await database
      .insert(ClinicSubscriptionModel)
      .values({
        clinicId,
        planId,
        startsAt: new Date(),
        expiresAt:
          billingCycle === 'yearly'
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        active: true,
        provider: 'razorpay',
        providerSubscriptionId: billingCycle,
        paymentMode: 'online',
        transactionId: paymentId,
        paymentStatus: 'success',
        price: String(subscriptionPrice),
      })
      .returning();

    // Process add-ons
    const activatedAddOns = [];

    for (const addOnItem of addOns) {
      const [addOn] = await database
        .select()
        .from(AddOnModel)
        .where(eq(AddOnModel.id, addOnItem.addOnId))
        .limit(1);

      if (!addOn) continue;

      const unitPrice =
        billingCycle === 'yearly'
          ? Number(addOn.yearlyPrice)
          : Number(addOn.monthlyPrice);

      const totalPrice = unitPrice * addOnItem.quantity;

      const [clinicAddOn] = await database
        .insert(ClinicAddOnModel)
        .values({
          clinicId,
          addOnId: addOn.id,
          quantity: addOnItem.quantity,
          billingCycle,
          startsAt: new Date(),
          expiresAt:
            billingCycle === 'yearly'
              ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true,
          provider: 'razorpay',
          providerSubscriptionId: orderId,
          paymentStatus: 'success',
          paymentMode: 'online',
          transactionId: paymentId,
          price: String(totalPrice),
        })
        .returning();

      activatedAddOns.push({
        ...clinicAddOn,
        addOn: {
          name: addOn.name,
          featureKey: addOn.featureKey,
        },
      });
    }

    // Clear cache
    const redisClient = (await import('../../../configurations/redisConfig'))
      .default;
    await redisClient.del(`purchase_intent:${orderId}`);
    await redisClient.del(`clinic_plan:${clinicId}`);
    await redisClient.del(`clinic_limits:${clinicId}`);
    await redisClient.del(`clinic_addons:${clinicId}`);
    await redisClient.del(`clinic_limits_overview:${clinicId}`);

    return sendCreated(res, 'Subscription and add-ons activated successfully', {
      subscription: {
        ...subscription,
        plan: {
          name: plan.name,
          slug: plan.slug,
        },
      },
      addOns: activatedAddOns,
      totalAmount:
        subscriptionPrice +
        activatedAddOns.reduce((sum, a) => sum + Number(a.price), 0),
    });
  }
);

/**
 * Get combined pricing preview (without creating order)
 * POST /api/v1/subscription/preview-combined-price
 */
export const previewCombinedPrice = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    const { planId, billingCycle = 'monthly', addOns = [] } = req.validatedBody;

    if (!clinicId) {
      throw new HttpError(400, 'Clinic context required');
    }

    // Get plan
    const plan = await database
      .select()
      .from(SubscriptionPlanModel)
      .where(eq(SubscriptionPlanModel.id, planId))
      .limit(1)
      .then((res) => res[0]);

    if (!plan) {
      throw new HttpError(404, 'Plan not found');
    }

    // Calculate prices
    const subscriptionPrice =
      billingCycle === 'yearly'
        ? Math.round(Number(plan.price) * 12 * 0.9)
        : Number(plan.price);

    let addOnsTotal = 0;
    const addOnDetails = [];

    for (const addOnItem of addOns) {
      const [addOn] = await database
        .select()
        .from(AddOnModel)
        .where(eq(AddOnModel.id, addOnItem.addOnId))
        .limit(1);

      if (!addOn || !addOn.isActive) continue;

      const unitPrice =
        billingCycle === 'yearly'
          ? Number(addOn.yearlyPrice)
          : Number(addOn.monthlyPrice);

      const totalPrice = unitPrice * addOnItem.quantity;
      addOnsTotal += totalPrice;

      addOnDetails.push({
        addOnId: addOn.id,
        name: addOn.name,
        featureKey: addOn.featureKey,
        unitPrice,
        quantity: addOnItem.quantity,
        totalPrice,
        billingCycle,
      });
    }

    return sendOk(res, 'Pricing preview', {
      plan: {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        billingCycle,
        price: subscriptionPrice,
      },
      addOns: addOnDetails,
      subscriptionPrice,
      addOnsTotal,
      grandTotal: subscriptionPrice + addOnsTotal,
      savings:
        billingCycle === 'yearly' ? Math.round(subscriptionPrice * 0.1) : 0,
    });
  }
);
