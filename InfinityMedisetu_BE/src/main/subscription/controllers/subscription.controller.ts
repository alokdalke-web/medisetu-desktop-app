import { Request, Response } from 'express';
import { SubscriptionService } from '../services/subscription.service';
import { asyncHandler, HttpError } from '../../../middlewear/errorHandler';
import { sendOk, sendCreated } from '../../../utils/response.utils';
import { envConfig } from '../../../utils/envConfig';
import {
  createRazorpayOrder,
  razorpayInstance,
  verifyRazorpayPayment,
  verifyWebhookSignature,
} from '../../../utils/razorpay';
import {
  ClinicSubscriptionModel,
  SubscriptionPlanModel,
} from '../models/subscription.model';
import { AddOnModel, ClinicAddOnModel } from '../models/addon.model';
import { ClinicModel } from '../../clinic/models/clinic.model';
import { database } from '../../../configurations/dbConnection';
import { and, desc, eq, gt, isNull, or } from 'drizzle-orm';
import redisClient from '../../../configurations/redisConfig';
import logger from '../../../utils/logger';
import { couponService } from '../services/coupon.service';

// create subscription plan
export const createPlan = asyncHandler(async (req: Request, res: Response) => {
  const { slug, name, description, price, currency, features } =
    req.validatedBody;

  // Ensure features is always an array
  const featuresArray = Array.isArray(features) ? features : [];

  const plan = await SubscriptionService.createPlan({
    slug,
    name,
    description,
    price,
    currency,
    features: featuresArray,
  });

  if (!plan) {
    throw new HttpError(400, 'Plan not created');
  }

  return sendCreated(res, 'Plan created successfully', plan);
});

// manage features (add/update/delete)
export const manageFeatures = asyncHandler(
  async (req: Request, res: Response) => {
    const { planId } = req.validatedParams;
    const payload = req.validatedBody;

    const features = await SubscriptionService.manageFeatures(planId, payload);

    return sendOk(res, 'Features managed successfully', features);
  }
);

// update a subscription plan (Super Admin)
export const updatePlan = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.validatedParams;
  const payload = req.validatedBody;

  const plan = await SubscriptionService.updatePlan(id, payload);

  return sendOk(res, 'Plan updated successfully', plan);
});

// delete a subscription plan (Super Admin)
export const deletePlan = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.validatedParams;

  const plan = await SubscriptionService.deletePlan(id);

  return sendOk(res, 'Plan deleted successfully', plan);
});

// get all subscription plans
export const getPlans = asyncHandler(async (_req: Request, res: Response) => {
  const plans = await SubscriptionService.getPlans();
  if (!plans) {
    throw new HttpError(400, 'Plans not found');
  }
  return sendOk(res, 'Plans fetched successfully', plans);
});

// ============ CLINIC SUBSCRIPTION CONTROLLERS ============

// subscribe clinic to a plan
// export const subscribeClinic = asyncHandler(
//   async (req: Request, res: Response) => {
//     const clinicId = req.clinicId; // From requireClinic middleware

//     if (!clinicId) {
//       throw new HttpError(400, 'Clinic context required');
//     }

//     const { planId, provider, providerSubscriptionId } = req.validatedBody;

//     const sub = await SubscriptionService.subscribeClinic({
//       clinicId,
//       planId,
//       provider: provider || 'manual',
//       providerSubscriptionId: providerSubscriptionId || 'manual',
//     });

//     if (!sub) {
//       throw new HttpError(400, 'Subscription failed');
//     }

//     res.status(201).json({
//       success: true,
//       message: 'Clinic subscribed successfully',
//       subscription: sub,
//     });
//   }
// );

export const subscribeClinic = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    const { planId, providerSubscriptionId, couponCode } = req.validatedBody;

    if (!clinicId) {
      throw new HttpError(400, 'Clinic context required');
    }

    const plan = await database
      .select()
      .from(SubscriptionPlanModel)
      .where(eq(SubscriptionPlanModel.id, planId))
      .limit(1)
      .then((res) => res[0]);

    if (!plan) {
      throw new HttpError(400, 'Invalid plan');
    }

    // Free plan - create subscription directly
    if (plan.slug === 'Free') {
      const sub = await SubscriptionService.subscribeClinic({
        clinicId,
        planId,
        provider: 'manual',
        providerSubscriptionId: 'free_plan',
        paymentMode: 'free',
        paymentStatus: 'success',
      });

      return sendCreated(res, 'Free subscription activated', sub);
    }

    let price =
      providerSubscriptionId === 'pro-yearly'
        ? Math.round(Number(plan.price) * 12 * 0.9)
        : Number(plan.price);

    // Apply coupon if provided
    let discountInfo: {
      couponId: number;
      couponCode: string;
      discountAmount: number;
      originalAmount: number;
    } | null = null;

    if (couponCode) {
      const couponResult = await couponService.applyCoupon({
        code: couponCode,
        clinicId,
        orderValue: price,
        planId,
        billingCycle:
          providerSubscriptionId === 'pro-yearly' ? 'yearly' : 'monthly',
      });

      if (!couponResult.success || !couponResult.data) {
        throw new HttpError(400, couponResult.error || 'Invalid coupon code');
      }

      discountInfo = {
        couponId: couponResult.data.couponId,
        couponCode: couponResult.data.couponCode,
        discountAmount: couponResult.data.discountAmount,
        originalAmount: price,
      };

      price = couponResult.data.finalAmount;
    }

    // If price is 0 after coupon (e.g., trial), activate directly
    if (price <= 0) {
      const sub = await SubscriptionService.subscribeClinic({
        clinicId,
        planId,
        provider: 'coupon',
        providerSubscriptionId: discountInfo?.couponCode || 'coupon_free',
        paymentMode: 'coupon',
        paymentStatus: 'success',
        price: '0',
      });

      // Record coupon usage
      if (discountInfo) {
        await couponService.recordUsage({
          couponId: discountInfo.couponId,
          clinicId,
          planId,
          orderValue: discountInfo.originalAmount,
          discountAmount: discountInfo.discountAmount,
          finalAmount: 0,
          billingCycle:
            providerSubscriptionId === 'pro-yearly' ? 'yearly' : 'monthly',
        });
      }

      return sendCreated(res, 'Subscription activated with coupon', sub);
    }

    const order = await createRazorpayOrder(
      price,
      clinicId,
      planId,
      providerSubscriptionId
    );

    return sendOk(res, 'Payment order created', {
      requiresPayment: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: envConfig.RAZORPAY_KEY_ID,
      planId,
      discount: discountInfo
        ? {
            couponCode: discountInfo.couponCode,
            couponId: discountInfo.couponId,
            discountAmount: discountInfo.discountAmount,
            originalAmount: discountInfo.originalAmount,
            finalAmount: price,
          }
        : undefined,
    });
  }
);

// New endpoint to verify payment and complete subscription
export const verifyAndSubscribe = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    const {
      orderId,
      paymentId,
      signature,
      planId,
      providerSubscriptionId,
      couponId,
      originalAmount,
      discountAmount,
    } = req.validatedBody;

    if (!clinicId) {
      throw new HttpError(400, 'Clinic context required');
    }

    const existingSubscription = await database
      .select()
      .from(ClinicSubscriptionModel)
      .where(eq(ClinicSubscriptionModel.transactionId, paymentId))
      .limit(1);

    if (existingSubscription.length > 0) {
      return sendOk(
        res,
        'Subscription already activated',
        existingSubscription[0]
      );
    }

    const isValid = verifyRazorpayPayment(orderId, paymentId, signature);
    if (!isValid) {
      throw new HttpError(400, 'Invalid payment');
    }

    await database
      .update(ClinicSubscriptionModel)
      .set({
        active: false,
        updatedAt: new Date(),
      })
      .where(eq(ClinicSubscriptionModel.clinicId, clinicId));

    // NOTE: Redis cache is invalidated AFTER new subscription is created
    // (inside SubscriptionService.subscribeClinic) to avoid a race condition
    // where the middleware caches { noSubscription: true } between deactivation and creation.

    let actualPaymentMethod = 'online';
    try {
      const paymentDetails = await razorpayInstance.payments.fetch(paymentId);
      actualPaymentMethod = paymentDetails.method || 'online';
    } catch {
      actualPaymentMethod = 'online';
    }

    // Create subscription with payment success
    const sub = await SubscriptionService.subscribeClinic({
      clinicId,
      planId,
      provider: 'razorpay',
      providerSubscriptionId: providerSubscriptionId,
      paymentMode: actualPaymentMethod,
      transactionId: paymentId,
      paymentStatus: 'success',
    });

    // Record coupon usage if coupon was applied
    if (couponId && originalAmount && discountAmount) {
      await couponService.recordUsage({
        couponId: parseInt(couponId),
        clinicId,
        planId: planId || undefined,
        orderValue: parseFloat(originalAmount),
        discountAmount: parseFloat(discountAmount),
        finalAmount: parseFloat(originalAmount) - parseFloat(discountAmount),
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        billingCycle:
          providerSubscriptionId === 'pro-yearly' ? 'yearly' : 'monthly',
      });
    }

    // Reactivate previously deactivated staff (if any were blocked due to expired plan)
    const { LimitationService } =
      await import('../services/limitation.service');
    const reactivation =
      await LimitationService.reactivateStaffOnUpgrade(clinicId);

    return sendCreated(res, 'Payment verified and subscription activated', {
      subscription: sub,
      staffReactivated: reactivation.staffReactivated,
      doctorsReactivated: reactivation.doctorsReactivated,
    });
  }
);

export const razorpayWebhookController = async (
  req: Request,
  res: Response
) => {
  const signature = req.headers['x-razorpay-signature'] as string;

  // Verify against the EXACT raw bytes Razorpay signed. Falls back to a
  // re-stringified body only if the raw buffer wasn't captured (should not
  // happen in production, but keeps local testing resilient).
  const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
  const bodyToVerify = rawBody
    ? rawBody.toString('utf8')
    : JSON.stringify(req.body);

  if (!signature || !verifyWebhookSignature(bodyToVerify, signature)) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const { event, payload } = req.body;

  try {
    if (event === 'payment.captured') {
      const payment = payload.payment.entity;

      // Check if subscription already exists (idempotency)
      const existingSubscription = await database
        .select()
        .from(ClinicSubscriptionModel)
        .where(eq(ClinicSubscriptionModel.transactionId, payment.id))
        .limit(1);

      if (existingSubscription.length > 0) {
        return res.json({ received: true });
      }

      const orderId = payment.order_id;
      const order = await razorpayInstance.orders.fetch(orderId);

      const notes =
        (order.notes as {
          clinicId?: string;
          planId?: string;
          providerSubscriptionId?: string;
        }) || {};
      const clinicId = notes.clinicId;
      const planId = notes.planId;
      const providerSubscriptionId = notes.providerSubscriptionId;

      // Add-on purchases share the same event but must NOT touch the base
      // subscription. Complete them via the add-on service (webhook backup for
      // when the frontend verify call never arrives). Idempotent by paymentId.
      if (providerSubscriptionId === 'addon-purchase') {
        const addOnItemsRaw = (order.notes as { addOnItems?: string })
          ?.addOnItems;
        if (clinicId && addOnItemsRaw) {
          const addOnItems = addOnItemsRaw
            .split(',')
            .map((chunk) => {
              const [addOnId, qty, cycle] = chunk.split(':');
              return {
                addOnId,
                quantity: Math.max(1, parseInt(qty, 10) || 1),
                billingCycle: (cycle === 'y' ? 'yearly' : 'monthly') as
                  'monthly' | 'yearly',
              };
            })
            .filter((i) => i.addOnId);

          if (addOnItems.length > 0) {
            const { AddOnService } = await import('../services/addon.service');
            await AddOnService.completePurchase(
              clinicId,
              addOnItems,
              payment.id,
              orderId
            );
          }
        }
        return res.json({ received: true });
      }

      if (!clinicId || !planId) {
        return res.json({ received: true });
      }

      // Guard: only proceed if the planId refers to a real subscription plan.
      const [validPlan] = await database
        .select({ id: SubscriptionPlanModel.id })
        .from(SubscriptionPlanModel)
        .where(eq(SubscriptionPlanModel.id, planId))
        .limit(1);

      if (!validPlan) {
        return res.json({ received: true });
      }

      await database
        .update(ClinicSubscriptionModel)
        .set({
          active: false,
          updatedAt: new Date(),
        })
        .where(eq(ClinicSubscriptionModel.clinicId, clinicId));

      await SubscriptionService.subscribeClinic({
        clinicId,
        planId,
        provider: 'razorpay',
        providerSubscriptionId: providerSubscriptionId,
        paymentMode: payment.method || 'online',
        transactionId: payment.id,
        paymentStatus: 'success',
      });
    } else if (event === 'payment.failed') {
      // Handle payment failure — log but don't deactivate
      const payment = payload.payment?.entity;
      if (payment?.order_id) {
        const order = await razorpayInstance.orders.fetch(payment.order_id);
        const notes = (order.notes as { clinicId?: string }) || {};
        if (notes.clinicId) {
          // Update payment status to failed for tracking
          await database
            .update(ClinicSubscriptionModel)
            .set({
              paymentStatus: 'failed',
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(ClinicSubscriptionModel.clinicId, notes.clinicId),
                eq(ClinicSubscriptionModel.active, true)
              )
            );

          // Invalidate cache so UI reflects failed state
          await redisClient.del(`clinic_active_subscription:${notes.clinicId}`);
          await redisClient.del(`clinic_plan:${notes.clinicId}`);
        }
      }
    } else if (event === 'account.activated') {
      const account = payload.account.entity;
      const accountId = account.id;
      await database
        .update(ClinicModel)
        .set({
          routeStatus: 'ACTIVE',
          routeOnboardedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(ClinicModel.razorpayAccountId, accountId));
    } else if (event === 'account.suspended') {
      const account = payload.account.entity;
      const accountId = account.id;
      await database
        .update(ClinicModel)
        .set({
          routeStatus: 'SUSPENDED',
          updatedAt: new Date(),
        })
        .where(eq(ClinicModel.razorpayAccountId, accountId));
    } else if (event === 'subscription.charged') {
      // Auto-renewal: Razorpay successfully charged the recurring subscription
      const subscription = payload.subscription?.entity;
      const payment = payload.payment?.entity;
      if (subscription?.id && payment?.id) {
        const { AutoRenewService } =
          await import('../services/autoRenew.service');
        await AutoRenewService.handleSubscriptionCharged(
          subscription.id,
          payment.id
        );
      }
    } else if (event === 'subscription.authenticated') {
      // Mandate authorized by the customer — NOW AutoPay is truly enabled.
      const subscription = payload.subscription?.entity;
      if (subscription?.id) {
        logger.info(
          `Webhook subscription.authenticated received for razorpay sub: ${subscription.id}`
        );
        const [updated] = await database
          .update(ClinicSubscriptionModel)
          .set({
            autoRenew: true,
            updatedAt: new Date(),
          })
          .where(
            eq(ClinicSubscriptionModel.razorpaySubscriptionId, subscription.id)
          )
          .returning({ clinicId: ClinicSubscriptionModel.clinicId });

        // Invalidate cache so the UI reflects "AutoPay enabled" immediately.
        if (updated?.clinicId) {
          await redisClient.del(
            `clinic_active_subscription:${updated.clinicId}`
          );
          await redisClient.del(`clinic_plan:${updated.clinicId}`);
          logger.info(
            `AutoPay enabled for clinic ${updated.clinicId} via subscription.authenticated webhook.`
          );
        } else {
          logger.warn(
            `subscription.authenticated: no matching row found for razorpaySubscriptionId=${subscription.id}`
          );
        }
      }
    } else if (event === 'subscription.pending') {
      // Payment is pending — subscription charge initiated but not yet completed
      const subscription = payload.subscription?.entity;
      if (subscription?.id) {
        const [sub] = await database
          .select({ clinicId: ClinicSubscriptionModel.clinicId })
          .from(ClinicSubscriptionModel)
          .where(
            eq(ClinicSubscriptionModel.razorpaySubscriptionId, subscription.id)
          )
          .limit(1);

        if (sub) {
          await redisClient.del(`clinic_active_subscription:${sub.clinicId}`);
        }
      }
    } else if (event === 'subscription.halted') {
      // Subscription halted due to repeated payment failures
      const subscription = payload.subscription?.entity;
      if (subscription?.id) {
        await database
          .update(ClinicSubscriptionModel)
          .set({
            autoRenew: false,
            razorpaySubscriptionId: null,
            updatedAt: new Date(),
          })
          .where(
            eq(ClinicSubscriptionModel.razorpaySubscriptionId, subscription.id)
          );

        const [sub] = await database
          .select({ clinicId: ClinicSubscriptionModel.clinicId })
          .from(ClinicSubscriptionModel)
          .where(
            eq(ClinicSubscriptionModel.razorpaySubscriptionId, subscription.id)
          )
          .limit(1);

        if (sub) {
          await redisClient.del(`clinic_active_subscription:${sub.clinicId}`);
          await redisClient.del(`clinic_plan:${sub.clinicId}`);
        }
      }
    } else if (event === 'subscription.cancelled') {
      // Subscription cancelled from Razorpay side
      const subscription = payload.subscription?.entity;
      if (subscription?.id) {
        await database
          .update(ClinicSubscriptionModel)
          .set({
            autoRenew: false,
            razorpaySubscriptionId: null,
            updatedAt: new Date(),
          })
          .where(
            eq(ClinicSubscriptionModel.razorpaySubscriptionId, subscription.id)
          );

        const [sub] = await database
          .select({ clinicId: ClinicSubscriptionModel.clinicId })
          .from(ClinicSubscriptionModel)
          .where(
            eq(ClinicSubscriptionModel.razorpaySubscriptionId, subscription.id)
          )
          .limit(1);

        if (sub) {
          await redisClient.del(`clinic_active_subscription:${sub.clinicId}`);
          await redisClient.del(`clinic_plan:${sub.clinicId}`);
        }
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    logger.error('Razorpay webhook handler error:', {
      event: req.body?.event,
      error: error?.message || error,
    });
    res.json({ received: true });
  }
};

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export const initialSubscribeClinic = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    const { planId } = req.validatedBody;

    const plan = await database
      .select()
      .from(SubscriptionPlanModel)
      .where(eq(SubscriptionPlanModel.id, planId))
      .limit(1)
      .then((res) => res[0]);

    if (!plan) {
      throw new HttpError(400, 'Invalid plan selected');
    }

    const startDate = new Date();
    let expiresAt: Date | null = null;

    if (plan.slug === 'Free') {
      expiresAt = null;
    } else {
      expiresAt = addDays(startDate, 15);
    }

    const [sub] = await database
      .insert(ClinicSubscriptionModel)
      .values({
        clinicId,
        planId,
        startsAt: startDate,
        expiresAt,
        active: true,
        provider: 'manual',
        providerSubscriptionId: 'manual',
        paymentMode: '-',
        transactionId: '-',
        paymentStatus: 'success',
        price: '0',
      })
      .returning();

    await redisClient.del(`clinic_active_subscription:${clinicId}`);
    await redisClient.del(`clinic_plan:${clinicId}`);
    await redisClient.del(`clinic_details:${clinicId}`);

    if (sub.active) {
      await SubscriptionService.updateUserSubscriptionExpiryCache(
        clinicId,
        sub.expiresAt
      );
    }

    return sendCreated(res, 'Subscription activated successfully', sub);
  }
);

// cancel clinic subscription
export const cancelClinicSubscription = asyncHandler(
  async (req: Request, res: Response) => {
    const { subscriptionId } = req.validatedBody;

    const result =
      await SubscriptionService.cancelClinicSubscription(subscriptionId);

    return sendOk(res, 'Clinic subscription cancelled successfully', {
      warnings: result.warnings,
    });
  }
);

// Schedule subscription cancellation at end of billing period
export const scheduleSubscriptionCancellation = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;

    if (!clinicId) {
      throw new HttpError(400, 'Clinic context required');
    }

    const reason = req.body?.reason;

    const subscription = await SubscriptionService.scheduleCancellation(
      clinicId,
      reason
    );

    return sendOk(
      res,
      'Subscription will be cancelled at end of current billing period',
      {
        subscription,
        cancelAtPeriodEnd: true,
        expiresAt: subscription.expiresAt,
      }
    );
  }
);

// Undo scheduled subscription cancellation
export const undoSubscriptionCancellation = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;

    if (!clinicId) {
      throw new HttpError(400, 'Clinic context required');
    }

    const subscription = await SubscriptionService.undoCancellation(clinicId);

    return sendOk(res, 'Subscription cancellation has been reversed', {
      subscription,
      cancelAtPeriodEnd: false,
    });
  }
);

// Subscribe to a paid plan WITH AutoPay (pay now + auto-renew).
// Creates a Razorpay recurring subscription and returns its hosted authorization
// URL. The plan is activated by the subscription.charged webhook.
export const subscribeWithAutoPay = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    if (!clinicId) {
      throw new HttpError(400, 'Clinic context required');
    }

    const { planId, billingCycle } = req.validatedBody;

    const { AutoRenewService } = await import('../services/autoRenew.service');
    const result = await AutoRenewService.subscribeWithAutoPay(
      clinicId,
      planId,
      billingCycle === 'yearly' ? 'yearly' : 'monthly'
    );

    return sendOk(res, 'AutoPay subscription created', {
      subscriptionId: result.subscriptionId,
      shortUrl: result.shortUrl,
      status: result.status,
      amount: result.amount,
      keyId: envConfig.RAZORPAY_KEY_ID,
      planId: result.planId,
      billingCycle: result.billingCycle,
    });
  }
);

// Schedule a plan downgrade at end of the current billing period.
// The current plan stays active until then. If AutoPay is on, the recurring
// mandate is cancelled at cycle end so the user isn't charged for the old plan.
export const schedulePlanDowngrade = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    if (!clinicId) {
      throw new HttpError(400, 'Clinic context required');
    }

    const { targetPlanId, billingCycle } = req.validatedBody;

    // Resolve the target plan's billing-cycle marker
    const [targetPlan] = await database
      .select()
      .from(SubscriptionPlanModel)
      .where(eq(SubscriptionPlanModel.id, targetPlanId))
      .limit(1);

    if (!targetPlan) {
      throw new HttpError(400, 'Invalid target plan');
    }

    const providerSubId =
      targetPlan.slug === 'Free'
        ? 'free_plan'
        : billingCycle === 'yearly'
          ? 'pro-yearly'
          : 'pro-monthly';

    const result = await SubscriptionService.schedulePlanChange(
      clinicId,
      targetPlanId,
      providerSubId
    );

    // If AutoPay is on, stop the recurring mandate at cycle end so the user
    // isn't charged for the old (higher) plan on the next cycle. They can
    // re-enable AutoPay on the new plan after the change takes effect.
    try {
      const { AutoRenewService } =
        await import('../services/autoRenew.service');
      const status = await AutoRenewService.getAutoRenewStatus(clinicId);
      if (status.autoRenew) {
        await AutoRenewService.disableAutoRenew(clinicId);
      }
    } catch {
      // best-effort — scheduling still succeeds
    }

    return sendOk(res, 'Plan change scheduled for end of billing period', {
      scheduledPlan: {
        id: result.targetPlan.id,
        name: result.targetPlan.name,
        slug: result.targetPlan.slug,
      },
      effectiveAt: result.effectiveAt,
    });
  }
);

// Undo a scheduled plan downgrade
export const undoScheduledPlanChange = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;
    if (!clinicId) {
      throw new HttpError(400, 'Clinic context required');
    }

    await SubscriptionService.undoScheduledPlanChange(clinicId);

    return sendOk(res, 'Scheduled plan change has been cancelled', {
      scheduledPlanId: null,
    });
  }
);

// Retry a failed / pending subscription payment
// Creates a fresh Razorpay order for the clinic's last unpaid subscription so
// the user can complete payment. Completion goes through /verify-subscription.
export const retrySubscriptionPayment = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;

    if (!clinicId) {
      throw new HttpError(400, 'Clinic context required');
    }

    // Find the most recent subscription record awaiting payment
    const [pendingSub] = await database
      .select({
        planId: ClinicSubscriptionModel.planId,
        paymentStatus: ClinicSubscriptionModel.paymentStatus,
        providerSubscriptionId: ClinicSubscriptionModel.providerSubscriptionId,
        slug: SubscriptionPlanModel.slug,
        price: SubscriptionPlanModel.price,
      })
      .from(ClinicSubscriptionModel)
      .innerJoin(
        SubscriptionPlanModel,
        eq(ClinicSubscriptionModel.planId, SubscriptionPlanModel.id)
      )
      .where(
        and(
          eq(ClinicSubscriptionModel.clinicId, clinicId),
          or(
            eq(ClinicSubscriptionModel.paymentStatus, 'pending'),
            eq(ClinicSubscriptionModel.paymentStatus, 'failed')
          )
        )
      )
      .orderBy(desc(ClinicSubscriptionModel.createdAt))
      .limit(1);

    if (!pendingSub) {
      throw new HttpError(404, 'No pending or failed payment found to retry.');
    }

    if (pendingSub.slug === 'Free') {
      throw new HttpError(400, 'Free plan does not require payment.');
    }

    const isYearly = pendingSub.providerSubscriptionId === 'pro-yearly';
    const price = isYearly
      ? Math.round(Number(pendingSub.price) * 12 * 0.9)
      : Number(pendingSub.price);

    const order = await createRazorpayOrder(
      price,
      clinicId,
      pendingSub.planId,
      pendingSub.providerSubscriptionId || 'pro-monthly'
    );

    return sendOk(res, 'Retry payment order created', {
      requiresPayment: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: envConfig.RAZORPAY_KEY_ID,
      planId: pendingSub.planId,
      providerSubscriptionId: pendingSub.providerSubscriptionId,
    });
  }
);

// get all active subscriptions for a clinic
export const getClinicSubscription = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;

    if (!clinicId) {
      throw new HttpError(400, 'Clinic context required');
    }

    const now = new Date();

    const subscriptions = await database
      .select({
        planName: SubscriptionPlanModel.name,
        planSlug: SubscriptionPlanModel.slug,
        price: ClinicSubscriptionModel.price,
        startsAt: ClinicSubscriptionModel.startsAt,
        expiresAt: ClinicSubscriptionModel.expiresAt,
        paymentMode: ClinicSubscriptionModel.paymentMode,
        paymentStatus: ClinicSubscriptionModel.paymentStatus,
        providerSubscriptionId: ClinicSubscriptionModel.providerSubscriptionId,
        cancelAtPeriodEnd: ClinicSubscriptionModel.cancelAtPeriodEnd,
        cancelledAt: ClinicSubscriptionModel.cancelledAt,
        autoRenew: ClinicSubscriptionModel.autoRenew,
        scheduledPlanId: ClinicSubscriptionModel.scheduledPlanId,
        scheduledPlanChangeAt: ClinicSubscriptionModel.scheduledPlanChangeAt,
      })
      .from(ClinicSubscriptionModel)
      .innerJoin(
        SubscriptionPlanModel,
        eq(ClinicSubscriptionModel.planId, SubscriptionPlanModel.id)
      )
      .where(
        and(
          eq(ClinicSubscriptionModel.clinicId, clinicId),
          eq(ClinicSubscriptionModel.active, true),
          // Treat a subscription as active only when it has no expiry
          // (e.g. Free plan) or its expiry is still in the future.
          or(
            isNull(ClinicSubscriptionModel.expiresAt),
            gt(ClinicSubscriptionModel.expiresAt, now)
          )
        )
      )
      .limit(1);

    const activeSubscription = subscriptions[0] || null;

    // Add-ons are only valid for paid plans. If there is no active
    // subscription or the active plan is the Free plan, skip add-ons.
    const isPaidPlan =
      activeSubscription !== null && activeSubscription.planSlug !== 'Free';

    // Fetch active add-ons for this clinic (paid plans only)
    const clinicAddOns = isPaidPlan
      ? await database
          .select({
            id: ClinicAddOnModel.id,
            addOnName: AddOnModel.name,
            featureKey: AddOnModel.featureKey,
            quantity: ClinicAddOnModel.quantity,
            billingCycle: ClinicAddOnModel.billingCycle,
            expiresAt: ClinicAddOnModel.expiresAt,
            price: ClinicAddOnModel.price,
            cancelAtPeriodEnd: ClinicAddOnModel.cancelAtPeriodEnd,
            cancelledAt: ClinicAddOnModel.cancelledAt,
          })
          .from(ClinicAddOnModel)
          .innerJoin(AddOnModel, eq(ClinicAddOnModel.addOnId, AddOnModel.id))
          .where(
            and(
              eq(ClinicAddOnModel.clinicId, clinicId),
              eq(ClinicAddOnModel.isActive, true)
            )
          )
      : [];

    // Filter out expired add-ons and group by featureKey
    const activeAddOns = clinicAddOns.filter(
      (a) => !a.expiresAt || new Date(a.expiresAt) > now
    );

    // Group add-ons by featureKey and sum quantities
    const groupedAddOns = Object.values(
      activeAddOns.reduce(
        (acc, addOn) => {
          if (!acc[addOn.featureKey]) {
            acc[addOn.featureKey] = {
              id: addOn.id,
              addOnName: addOn.addOnName,
              featureKey: addOn.featureKey,
              totalQuantity: 0,
              billingCycle: addOn.billingCycle,
              latestExpiresAt: addOn.expiresAt,
              totalPrice: 0,
              cancelAtPeriodEnd: addOn.cancelAtPeriodEnd || false,
              cancelledAt: addOn.cancelledAt || null,
            };
          }
          acc[addOn.featureKey].totalQuantity += addOn.quantity;
          acc[addOn.featureKey].totalPrice += Number(addOn.price);
          // If any record for this feature is marked for cancellation, reflect it
          if (addOn.cancelAtPeriodEnd) {
            acc[addOn.featureKey].cancelAtPeriodEnd = true;
            acc[addOn.featureKey].cancelledAt = addOn.cancelledAt;
          }
          // Keep the latest expiry date
          if (
            addOn.expiresAt &&
            (!acc[addOn.featureKey].latestExpiresAt ||
              new Date(addOn.expiresAt) >
                new Date(acc[addOn.featureKey].latestExpiresAt!))
          ) {
            acc[addOn.featureKey].latestExpiresAt = addOn.expiresAt;
          }
          return acc;
        },
        {} as Record<
          string,
          {
            id: string;
            addOnName: string;
            featureKey: string;
            totalQuantity: number;
            billingCycle: string;
            latestExpiresAt: Date | null;
            totalPrice: number;
            cancelAtPeriodEnd: boolean;
            cancelledAt: Date | null;
          }
        >
      )
    );

    return sendOk(res, 'Clinic subscription fetched successfully', {
      subscription: activeSubscription,
      hasActive: activeSubscription !== null,
      addOns: groupedAddOns,
      usage: await (async () => {
        const { LimitationService } =
          await import('../services/limitation.service');
        const doctorCheck = await LimitationService.checkDoctorLimit(clinicId);
        const staffCheck = await LimitationService.checkStaffLimit(clinicId);

        return {
          doctors: {
            current: doctorCheck.currentUsage,
            limit: doctorCheck.limit,
            isUnlimited: doctorCheck.isUnlimited,
            remaining: doctorCheck.remaining,
          },
          staff: {
            current: staffCheck.currentUsage,
            limit: staffCheck.limit,
            isUnlimited: staffCheck.isUnlimited,
            remaining: staffCheck.remaining,
          },
        };
      })(),
    });
  }
);

// get billing history for a clinic
export const getBillingHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const clinicId = req.clinicId;

    if (!clinicId) {
      throw new HttpError(400, 'Clinic context required');
    }

    const history = await SubscriptionService.getClinicBillingHistory(clinicId);

    return sendOk(res, 'Billing history fetched successfully', history);
  }
);
