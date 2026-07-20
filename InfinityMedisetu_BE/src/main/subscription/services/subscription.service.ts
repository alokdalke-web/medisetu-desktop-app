// src/main/subscription/services/subscription.service.ts
import { database } from '../../../configurations/dbConnection';
import { HttpError } from '../../../middlewear/errorHandler';
import {
  SubscriptionPlanModel,
  ClinicSubscriptionModel,
} from '../models/subscription.model';
import { PlanFeaturesModel } from '../models/planFeatures.model';
import { AddOnModel, ClinicAddOnModel } from '../models/addon.model';
import { and, eq, asc, inArray, isNotNull, lte } from 'drizzle-orm';
import redisClient from '../../../configurations/redisConfig';
import { ManageFeaturesBodyDto } from '../schemas/subscription.schemas';
import {
  ClinicAssignModel,
  ClinicModel,
} from '../../clinic/models/clinic.model';
import { UserModel } from '../../users/models/user.model';
import { ne } from 'drizzle-orm';

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export class SubscriptionService {
  static async createPlan(payload: {
    slug: string;
    name: string;
    description?: string;
    price?: string | number;
    currency?: string;
    features?: {
      name: string;
      description?: string;
    }[];
  }) {
    return database.transaction(async (tx) => {
      // 1️⃣ Create / Update Plan
      const [plan] = await tx
        .insert(SubscriptionPlanModel)
        .values({
          slug: payload.slug,
          name: payload.name,
          description: payload.description,
          price: String(payload.price ?? '0.00'),
          currency: payload.currency ?? 'INR', // default INR
        })
        .onConflictDoUpdate({
          target: [SubscriptionPlanModel.slug],
          set: {
            name: payload.name,
            description: payload.description,
            price: String(payload.price ?? '0.00'),
            currency: payload.currency ?? 'INR',
            updatedAt: new Date(),
          },
        })
        .returning();

      // 2️⃣ Insert / Update Features
      const featuresToInsert = payload.features ?? [];

      for (const feature of featuresToInsert) {
        // Convert display name to feature key (snake_case)
        const featureKey = feature.name
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '');

        await tx
          .insert(PlanFeaturesModel)
          .values({
            planId: plan.id,
            featureKey,
            displayName: feature.name,
            description: feature.description ?? '',
            type: 'marketing',
          })
          .onConflictDoUpdate({
            target: [PlanFeaturesModel.planId, PlanFeaturesModel.featureKey],
            set: {
              displayName: feature.name,
              description: feature.description ?? '',
              updatedAt: new Date(),
            },
          });
      }

      return plan;
    });
  }

  static async manageFeatures(planId: string, payload: ManageFeaturesBodyDto) {
    const { add, update, delete: deleteIds } = payload;

    return database.transaction(async (tx) => {
      // 1. Delete features
      if (deleteIds && deleteIds.length > 0) {
        await tx
          .delete(PlanFeaturesModel)
          .where(
            and(
              eq(PlanFeaturesModel.planId, planId),
              inArray(PlanFeaturesModel.id, deleteIds)
            )
          );
      }

      // 2. Update features
      if (update && update.length > 0) {
        for (const feature of update) {
          const { id, ...updateData } = feature;
          await tx
            .update(PlanFeaturesModel)
            .set(updateData)
            .where(
              and(
                eq(PlanFeaturesModel.id, id),
                eq(PlanFeaturesModel.planId, planId)
              )
            );
        }
      }

      // 3. Add features
      if (add && add.length > 0) {
        const featuresToInsert = add.map((f) => ({
          planId,
          featureKey: f.name.toLowerCase().replace(/\s+/g, '_'),
          displayName: f.name,
          description: f.description ?? '',
          type: 'marketing' as const,
          isMarketingFeature: true,
        }));
        await tx.insert(PlanFeaturesModel).values(featuresToInsert);
      }

      // Return all features for the plan after updates
      return tx
        .select()
        .from(PlanFeaturesModel)
        .where(eq(PlanFeaturesModel.planId, planId));
    });
  }

  static async updatePlan(
    id: string,
    payload: {
      slug?: string;
      name?: string;
      description?: string;
      price?: string | number;
      currency?: string;
    }
  ) {
    const [updated] = await database
      .update(SubscriptionPlanModel)
      .set({
        ...(payload.slug !== undefined && { slug: payload.slug }),
        ...(payload.name !== undefined && { name: payload.name }),
        ...(payload.description !== undefined && {
          description: payload.description,
        }),
        ...(payload.price !== undefined && { price: String(payload.price) }),
        ...(payload.currency !== undefined && { currency: payload.currency }),
        updatedAt: new Date(),
      })
      .where(eq(SubscriptionPlanModel.id, id))
      .returning();

    if (!updated) {
      throw new HttpError(404, 'Subscription plan not found');
    }
    return updated;
  }

  static async deletePlan(id: string) {
    const [deleted] = await database
      .delete(SubscriptionPlanModel)
      .where(eq(SubscriptionPlanModel.id, id))
      .returning();

    if (!deleted) {
      throw new HttpError(404, 'Subscription plan not found');
    }
    return deleted;
  }

  static async getPlans() {
    // Fetch all plans
    const plans = await database
      .select()
      .from(SubscriptionPlanModel)
      .orderBy(asc(SubscriptionPlanModel.price));

    // Fetch features for all plans
    const planIds = plans.map((p) => p.id);
    const features = await database
      .select()
      .from(PlanFeaturesModel)
      .where(inArray(PlanFeaturesModel.planId, planIds));

    // Attach features to plans
    return plans.map((plan) => ({
      ...plan,
      features: features.filter((f) => f.planId === plan.id),
    }));
  }

  static async getPlanBySlug(slug: string) {
    // Fetch plan by slug
    const [plan] = await database
      .select()
      .from(SubscriptionPlanModel)
      .where(eq(SubscriptionPlanModel.slug, slug))
      .limit(1);

    if (!plan) return null;

    // Fetch features for this plan
    const planFeatures = await database
      .select()
      .from(PlanFeaturesModel)
      .where(eq(PlanFeaturesModel.planId, plan.id));

    return {
      ...plan,
      features: planFeatures,
    };
  }

  static async subscribeClinic({
    clinicId,
    planId,
    startsAt,
    provider,
    providerSubscriptionId,
    paymentMode,
    transactionId,
    paymentStatus,
    price,
  }: {
    clinicId: string;
    planId: string;
    startsAt?: Date;
    provider?: string;
    providerSubscriptionId?: string;
    paymentMode?: string;
    transactionId?: string;
    paymentStatus?: string;
    price?: string | number;
  }) {
    const startDate = startsAt ?? new Date();

    const plan = await database
      .select()
      .from(SubscriptionPlanModel)
      .where(eq(SubscriptionPlanModel.id, planId))
      .limit(1)
      .then((res) => res[0]);

    if (!plan) {
      throw new Error('Invalid plan selected');
    }

    let expiresAt: Date | null = null;

    if (plan.slug === 'Free') {
      expiresAt = null;
    } else if (providerSubscriptionId === 'pro-yearly') {
      expiresAt = addDays(startDate, 365);
    } else {
      const existingSubscription = await database
        .select({ id: ClinicSubscriptionModel.id })
        .from(ClinicSubscriptionModel)
        .where(eq(ClinicSubscriptionModel.clinicId, clinicId))
        .limit(1);

      const isFirstTimeSubscription = existingSubscription.length === 0;

      if (isFirstTimeSubscription) {
        expiresAt = addDays(startDate, 30);
      } else {
        expiresAt = addDays(startDate, 30);
      }
    }

    // Deactivate all existing subscriptions for this clinic
    await database
      .update(ClinicSubscriptionModel)
      .set({
        active: false,
        updatedAt: new Date(),
      })
      .where(eq(ClinicSubscriptionModel.clinicId, clinicId));

    // ✅ Fix: Convert price to string properly
    const finalPaymentMode =
      paymentMode || (plan.slug === 'Free' ? 'free' : 'razorpay');
    const finalTransactionId = transactionId || `txn_${Date.now()}`;
    const finalPaymentStatus =
      paymentStatus || (plan.slug === 'Free' ? 'success' : 'pending');
    const computedPrice =
      providerSubscriptionId === 'pro-yearly'
        ? Math.round(Number(plan.price) * 12 * 0.9)
        : price != null
          ? Number(price)
          : Number(plan.price);

    const finalPrice = String(computedPrice);

    // Create new subscription entry
    const [sub] = await database
      .insert(ClinicSubscriptionModel)
      .values({
        clinicId,
        planId,
        startsAt: startDate,
        expiresAt,
        active: finalPaymentStatus === 'success',
        provider: provider || 'razorpay',
        providerSubscriptionId: providerSubscriptionId || 'manual',
        paymentMode: finalPaymentMode,
        transactionId: finalTransactionId,
        paymentStatus: finalPaymentStatus,
        price: finalPrice,
        // AutoPay is OFF by default. A plan purchase is a one-time payment;
        // AutoPay only turns on after the user explicitly enables it and
        // authorizes a Razorpay mandate (confirmed via webhook).
        autoRenew: false,
      })
      .returning();

    // Redis cache invalidate
    await redisClient.del(`clinic_active_subscription:${clinicId}`);
    await redisClient.del(`clinic_plan:${clinicId}`);
    await redisClient.del(`clinic_details:${clinicId}`);

    if (sub.active) {
      await SubscriptionService.updateUserSubscriptionExpiryCache(
        clinicId,
        sub.expiresAt
      );
    }

    return sub;
  }

  static async updateUserSubscriptionExpiryCache(
    clinicId: string,
    expiresAt: Date | null
  ) {
    const assignedUsers = await database
      .select({ userId: ClinicAssignModel.userId })
      .from(ClinicAssignModel)
      .where(eq(ClinicAssignModel.clinicId, clinicId));

    for (const user of assignedUsers) {
      const redisKey = `user_subscription_expiry:${user.userId}`;
      if (expiresAt) {
        const now = new Date();
        const expiryDate = new Date(expiresAt);
        const ttl = Math.floor((expiryDate.getTime() - now.getTime()) / 1000);
        if (ttl > 0) {
          await redisClient.setex(redisKey, ttl, expiryDate.toISOString());
        } else {
          await redisClient.setex(redisKey, 300, expiryDate.toISOString());
        }
      } else {
        await redisClient.setex(redisKey, 86400, 'null');
      }
    }
  }

  /**
   * Schedule cancellation at end of billing period.
   * Subscription stays active until expires_at, then won't renew.
   */
  static async scheduleCancellation(clinicId: string, reason?: string) {
    const [subscription] = await database
      .select()
      .from(ClinicSubscriptionModel)
      .where(
        and(
          eq(ClinicSubscriptionModel.clinicId, clinicId),
          eq(ClinicSubscriptionModel.active, true)
        )
      )
      .limit(1);

    if (!subscription) {
      throw new HttpError(404, 'No active subscription found');
    }

    const [updated] = await database
      .update(ClinicSubscriptionModel)
      .set({
        cancelAtPeriodEnd: true,
        cancelledAt: new Date(),
        cancellationReason: reason || null,
        updatedAt: new Date(),
      })
      .where(eq(ClinicSubscriptionModel.id, subscription.id))
      .returning();

    // Invalidate cache
    await redisClient.del(`clinic_active_subscription:${clinicId}`);
    await redisClient.del(`clinic_plan:${clinicId}`);

    return updated;
  }

  /**
   * Undo a scheduled cancellation (re-enable renewal).
   */
  static async undoCancellation(clinicId: string) {
    const [subscription] = await database
      .select()
      .from(ClinicSubscriptionModel)
      .where(
        and(
          eq(ClinicSubscriptionModel.clinicId, clinicId),
          eq(ClinicSubscriptionModel.active, true),
          eq(ClinicSubscriptionModel.cancelAtPeriodEnd, true)
        )
      )
      .limit(1);

    if (!subscription) {
      throw new HttpError(
        404,
        'No subscription with pending cancellation found'
      );
    }

    const [updated] = await database
      .update(ClinicSubscriptionModel)
      .set({
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        cancellationReason: null,
        updatedAt: new Date(),
      })
      .where(eq(ClinicSubscriptionModel.id, subscription.id))
      .returning();

    // Invalidate cache
    await redisClient.del(`clinic_active_subscription:${clinicId}`);
    await redisClient.del(`clinic_plan:${clinicId}`);

    return updated;
  }

  /**
   * Schedule a plan change (downgrade) to take effect at the end of the current
   * billing period. The current plan stays fully active until then.
   *
   * @param targetPlanId  Plan to switch to at period end
   * @param targetProviderSubscriptionId  Billing-cycle marker for the target
   *   plan ('pro-monthly' | 'pro-yearly' | 'free_plan')
   */
  static async schedulePlanChange(
    clinicId: string,
    targetPlanId: string,
    targetProviderSubscriptionId: string
  ) {
    const [subscription] = await database
      .select()
      .from(ClinicSubscriptionModel)
      .where(
        and(
          eq(ClinicSubscriptionModel.clinicId, clinicId),
          eq(ClinicSubscriptionModel.active, true)
        )
      )
      .limit(1);

    if (!subscription) {
      throw new HttpError(404, 'No active subscription found');
    }

    // Validate the target plan exists
    const [targetPlan] = await database
      .select()
      .from(SubscriptionPlanModel)
      .where(eq(SubscriptionPlanModel.id, targetPlanId))
      .limit(1);

    if (!targetPlan) {
      throw new HttpError(400, 'Invalid target plan');
    }

    if (targetPlanId === subscription.planId) {
      throw new HttpError(400, 'You are already on this plan');
    }

    // The change applies when the current period ends
    const changeAt = subscription.expiresAt ?? new Date();

    const [updated] = await database
      .update(ClinicSubscriptionModel)
      .set({
        scheduledPlanId: targetPlanId,
        scheduledPlanChangeAt: changeAt,
        scheduledProviderSubscriptionId: targetProviderSubscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(ClinicSubscriptionModel.id, subscription.id))
      .returning();

    await redisClient.del(`clinic_active_subscription:${clinicId}`);
    await redisClient.del(`clinic_plan:${clinicId}`);

    return { subscription: updated, targetPlan, effectiveAt: changeAt };
  }

  /**
   * Undo a scheduled plan change before it takes effect.
   */
  static async undoScheduledPlanChange(clinicId: string) {
    const [subscription] = await database
      .select()
      .from(ClinicSubscriptionModel)
      .where(
        and(
          eq(ClinicSubscriptionModel.clinicId, clinicId),
          eq(ClinicSubscriptionModel.active, true)
        )
      )
      .limit(1);

    if (!subscription || !subscription.scheduledPlanId) {
      throw new HttpError(404, 'No scheduled plan change found');
    }

    const [updated] = await database
      .update(ClinicSubscriptionModel)
      .set({
        scheduledPlanId: null,
        scheduledPlanChangeAt: null,
        scheduledProviderSubscriptionId: null,
        updatedAt: new Date(),
      })
      .where(eq(ClinicSubscriptionModel.id, subscription.id))
      .returning();

    await redisClient.del(`clinic_active_subscription:${clinicId}`);
    await redisClient.del(`clinic_plan:${clinicId}`);

    return updated;
  }

  /**
   * Apply a scheduled plan change. Called at renewal (webhook) or by the
   * expiry cron when the current period ends.
   *
   * Switches the subscription to the scheduled plan, resets the billing period,
   * and enforces limits (deactivating excess staff/doctors if downgrading).
   */
  static async applyScheduledPlanChange(clinicId: string) {
    const [subscription] = await database
      .select()
      .from(ClinicSubscriptionModel)
      .where(
        and(
          eq(ClinicSubscriptionModel.clinicId, clinicId),
          eq(ClinicSubscriptionModel.active, true)
        )
      )
      .limit(1);

    if (!subscription || !subscription.scheduledPlanId) {
      return { applied: false };
    }

    const [targetPlan] = await database
      .select()
      .from(SubscriptionPlanModel)
      .where(eq(SubscriptionPlanModel.id, subscription.scheduledPlanId))
      .limit(1);

    if (!targetPlan) {
      // Target plan disappeared — clear the schedule to avoid a stuck state.
      await database
        .update(ClinicSubscriptionModel)
        .set({
          scheduledPlanId: null,
          scheduledPlanChangeAt: null,
          scheduledProviderSubscriptionId: null,
          updatedAt: new Date(),
        })
        .where(eq(ClinicSubscriptionModel.id, subscription.id));
      return { applied: false };
    }

    const now = new Date();
    const isYearly =
      subscription.scheduledProviderSubscriptionId === 'pro-yearly';
    const isFree = targetPlan.slug === 'Free';

    // New period
    let newExpiry: Date | null;
    if (isFree) {
      newExpiry = null; // Free never expires
    } else {
      newExpiry = new Date(now);
      if (isYearly) newExpiry.setFullYear(newExpiry.getFullYear() + 1);
      else newExpiry.setDate(newExpiry.getDate() + 30);
    }

    const price = isFree
      ? '0'
      : isYearly
        ? String(Math.round(Number(targetPlan.price) * 12 * 0.9))
        : String(Number(targetPlan.price));

    await database
      .update(ClinicSubscriptionModel)
      .set({
        planId: targetPlan.id,
        providerSubscriptionId:
          subscription.scheduledProviderSubscriptionId ?? 'manual',
        startsAt: now,
        expiresAt: newExpiry,
        price,
        // Downgrading to Free removes auto-pay
        autoRenew: isFree ? false : subscription.autoRenew,
        razorpaySubscriptionId: isFree
          ? null
          : subscription.razorpaySubscriptionId,
        // Clear the schedule
        scheduledPlanId: null,
        scheduledPlanChangeAt: null,
        scheduledProviderSubscriptionId: null,
        updatedAt: now,
      })
      .where(eq(ClinicSubscriptionModel.id, subscription.id));

    // Invalidate caches
    await redisClient.del(`clinic_active_subscription:${clinicId}`);
    await redisClient.del(`clinic_plan:${clinicId}`);
    await redisClient.del(`clinic_limits_overview:${clinicId}`);
    await redisClient.del(`clinic_limits:${clinicId}`);

    await SubscriptionService.updateUserSubscriptionExpiryCache(
      clinicId,
      newExpiry
    );

    // Enforce limits on the new (lower) plan — deactivate excess staff/doctors
    const { LimitationService } = await import('./limitation.service');
    const enforcement =
      await LimitationService.enforceStaffLimitsOnExpiry(clinicId);

    return {
      applied: true,
      newPlanSlug: targetPlan.slug,
      warnings: enforcement.warnings,
    };
  }

  /**
   * Process all subscriptions whose scheduled plan change is now due.
   * Intended to be called by a daily cron.
   */
  static async processDueScheduledPlanChanges(): Promise<{
    processed: number;
    applied: number;
    errors: string[];
  }> {
    const now = new Date();
    const errors: string[] = [];
    let applied = 0;

    const due = await database
      .select({ clinicId: ClinicSubscriptionModel.clinicId })
      .from(ClinicSubscriptionModel)
      .where(
        and(
          eq(ClinicSubscriptionModel.active, true),
          isNotNull(ClinicSubscriptionModel.scheduledPlanId),
          lte(ClinicSubscriptionModel.scheduledPlanChangeAt, now)
        )
      );

    for (const row of due) {
      try {
        const result = await SubscriptionService.applyScheduledPlanChange(
          row.clinicId
        );
        if (result.applied) applied++;
      } catch (err) {
        errors.push(
          `Clinic ${row.clinicId}: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    }

    return { processed: due.length, applied, errors };
  }

  /**
   * Cancel clinic subscription.
   * Enforces staff limits by deactivating excess staff/doctors on the fallback plan.
   * Returns info about deactivated users so the frontend can display it.
   */
  static async cancelClinicSubscription(subscriptionId: string) {
    // Get the subscription to find the clinicId
    const [subscription] = await database
      .select({
        id: ClinicSubscriptionModel.id,
        clinicId: ClinicSubscriptionModel.clinicId,
      })
      .from(ClinicSubscriptionModel)
      .where(eq(ClinicSubscriptionModel.id, subscriptionId))
      .limit(1);

    if (!subscription) {
      throw new HttpError(404, 'Subscription not found');
    }

    // Deactivate subscription
    await database
      .update(ClinicSubscriptionModel)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(ClinicSubscriptionModel.id, subscriptionId));

    // Invalidate cache
    await redisClient.del(
      `clinic_active_subscription:${subscription.clinicId}`
    );
    await redisClient.del(`clinic_plan:${subscription.clinicId}`);
    await redisClient.del(`clinic_details:${subscription.clinicId}`);
    await redisClient.del(`clinic_limits_overview:${subscription.clinicId}`);

    // Invalidate user subscription expiry cache
    const assignedUsers = await database
      .select({ userId: ClinicAssignModel.userId })
      .from(ClinicAssignModel)
      .where(eq(ClinicAssignModel.clinicId, subscription.clinicId));

    for (const user of assignedUsers) {
      await redisClient.del(`user_subscription_expiry:${user.userId}`);
    }

    // Enforce staff limits — deactivate excess staff/doctors
    const { LimitationService } = await import('./limitation.service');
    const enforcement = await LimitationService.enforceStaffLimitsOnExpiry(
      subscription.clinicId
    );

    return {
      cancelled: true,
      warnings: enforcement.warnings,
      doctorsDeactivated: enforcement.doctorsDeactivated,
      staffDeactivated: enforcement.staffDeactivated,
    };
  }

  /**
   * Get active subscriptions for a clinic
   */
  static async getActiveSubscriptionsForClinic(clinicId: string) {
    const subs = await database
      .select()
      .from(ClinicSubscriptionModel)
      .where(
        and(
          eq(ClinicSubscriptionModel.clinicId, clinicId),
          eq(ClinicSubscriptionModel.active, true)
        )
      );
    return subs;
  }

  /**
   * Check if clinic has active subscription
   */
  static async clinicHasActiveSubscription(clinicId: string): Promise<boolean> {
    const subs = await this.getActiveSubscriptionsForClinic(clinicId);

    if (subs.length === 0) {
      return false;
    }

    const now = new Date();
    for (const sub of subs) {
      if (!sub.expiresAt || new Date(sub.expiresAt) > now) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get billing history for a clinic (latest first)
   */
  static async getClinicBillingHistory(clinicId: string) {
    const now = new Date();

    const subscriptionHistory = await database
      .select({
        id: ClinicSubscriptionModel.id,
        currency: SubscriptionPlanModel.currency,
        startsAt: ClinicSubscriptionModel.startsAt,
        expiresAt: ClinicSubscriptionModel.expiresAt,
        createdAt: ClinicSubscriptionModel.createdAt,
        paymentMode: ClinicSubscriptionModel.paymentMode,
        transactionId: ClinicSubscriptionModel.transactionId,
        paymentStatus: ClinicSubscriptionModel.paymentStatus,
        price: ClinicSubscriptionModel.price,

        planName: SubscriptionPlanModel.name,
        planDescription: SubscriptionPlanModel.description,

        clinicId: ClinicModel.id,
        clinicName: ClinicModel.clinicName,
        clinicAddress: ClinicModel.clinicAddress,
        clinicPhone: ClinicModel.clinicPhone,
        clinicState: ClinicModel.State,
        clinicCity: ClinicModel.City,
        ZipCode: ClinicModel.ZipCode,

        adminId: UserModel.id,
        adminName: UserModel.name,
        adminEmail: UserModel.email,
        adminMobile: UserModel.mobile,
      })
      .from(ClinicSubscriptionModel)
      .innerJoin(
        SubscriptionPlanModel,
        eq(ClinicSubscriptionModel.planId, SubscriptionPlanModel.id)
      )
      .innerJoin(
        ClinicModel,
        eq(ClinicSubscriptionModel.clinicId, ClinicModel.id)
      )
      .innerJoin(
        ClinicAssignModel,
        and(
          eq(ClinicAssignModel.clinicId, ClinicModel.id),
          eq(ClinicAssignModel.userId, ClinicModel.userId)
        )
      )
      .innerJoin(UserModel, eq(ClinicAssignModel.userId, UserModel.id))
      .where(
        and(
          eq(ClinicSubscriptionModel.clinicId, clinicId),
          eq(ClinicSubscriptionModel.paymentStatus, 'success'),
          ne(ClinicSubscriptionModel.transactionId, '-'),
          ne(SubscriptionPlanModel.name, 'Free')
        )
      );

    const addOnHistory = await database
      .select({
        id: ClinicAddOnModel.id,
        currency: AddOnModel.currency,
        startsAt: ClinicAddOnModel.startsAt,
        expiresAt: ClinicAddOnModel.expiresAt,
        createdAt: ClinicAddOnModel.createdAt,
        paymentMode: ClinicAddOnModel.paymentMode,
        transactionId: ClinicAddOnModel.transactionId,
        paymentStatus: ClinicAddOnModel.paymentStatus,
        price: ClinicAddOnModel.price,

        planName: AddOnModel.name,
        planDescription: AddOnModel.description,

        clinicId: ClinicModel.id,
        clinicName: ClinicModel.clinicName,
        clinicAddress: ClinicModel.clinicAddress,
        clinicPhone: ClinicModel.clinicPhone,
        clinicState: ClinicModel.State,
        clinicCity: ClinicModel.City,
        ZipCode: ClinicModel.ZipCode,

        adminId: UserModel.id,
        adminName: UserModel.name,
        adminEmail: UserModel.email,
        adminMobile: UserModel.mobile,
      })
      .from(ClinicAddOnModel)
      .innerJoin(AddOnModel, eq(ClinicAddOnModel.addOnId, AddOnModel.id))
      .innerJoin(ClinicModel, eq(ClinicAddOnModel.clinicId, ClinicModel.id))
      .innerJoin(
        ClinicAssignModel,
        and(
          eq(ClinicAssignModel.clinicId, ClinicModel.id),
          eq(ClinicAssignModel.userId, ClinicModel.userId)
        )
      )
      .innerJoin(UserModel, eq(ClinicAssignModel.userId, UserModel.id))
      .where(
        and(
          eq(ClinicAddOnModel.clinicId, clinicId),
          eq(ClinicAddOnModel.paymentStatus, 'success'),
          ne(ClinicAddOnModel.transactionId, '-')
        )
      );

    // Merge both arrays
    const combinedHistory = [...subscriptionHistory, ...addOnHistory];

    // Sort by createdAt in descending order (latest first)
    combinedHistory.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const history = combinedHistory.map((item) => ({
      ...item,
      active:
        item.paymentStatus === 'success' && item.expiresAt
          ? new Date(item.expiresAt) > now
          : item.paymentStatus === 'success',
    }));

    return history;
  }
}
