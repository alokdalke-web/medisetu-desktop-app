// src/main/subscription/services/addon.service.ts
import { and, asc, eq } from 'drizzle-orm';
import { database } from '../../../configurations/dbConnection';
import redisClient from '../../../configurations/redisConfig';
import { HttpError } from '../../../middlewear/errorHandler';
import { createRazorpayOrder } from '../../../utils/razorpay';
import { AddOnModel, ClinicAddOnModel } from '../models/addon.model';
import {
  ClinicSubscriptionModel,
  SubscriptionPlanModel,
} from '../models/subscription.model';
import { CreateAddOnDto, UpdateAddOnDto } from '../schemas/addon.schemas';

// Pricing constants
const ADD_ON_PRICING = {
  additional_doctor: { monthly: 499, yearly: 5389 }, // 10% yearly discount
  additional_staff: { monthly: 99, yearly: 1069 },
  additional_storage: { monthly: 199, yearly: 2149 },
  additional_branch: { monthly: 999, yearly: 10789 },
} as const;

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getAddOnPrice(
  featureKey: string,
  billingCycle: 'monthly' | 'yearly'
): number {
  const pricing = ADD_ON_PRICING[featureKey as keyof typeof ADD_ON_PRICING];
  if (!pricing) return 0;
  return billingCycle === 'monthly' ? pricing.monthly : pricing.yearly;
}

export class AddOnService {
  // ==================== Admin Methods ====================

  /**
   * Create a new add-on
   */
  static async createAddOn(payload: CreateAddOnDto) {
    const [addOn] = await database
      .insert(AddOnModel)
      .values({
        name: payload.name,
        description: payload.description,
        featureKey: payload.featureKey,
        unitValue: payload.unitValue ?? 1,
        monthlyPrice: String(payload.monthlyPrice),
        yearlyPrice: String(payload.yearlyPrice),
        currency: payload.currency ?? 'INR',
        isActive: payload.isActive ?? true,
      })
      .returning();

    if (!addOn) {
      throw new HttpError(500, 'Failed to create add-on');
    }

    return addOn;
  }

  /**
   * Update an existing add-on
   */
  static async updateAddOn(id: string, payload: UpdateAddOnDto) {
    const [updated] = await database
      .update(AddOnModel)
      .set({
        ...(payload.name !== undefined && { name: payload.name }),
        ...(payload.description !== undefined && {
          description: payload.description,
        }),
        ...(payload.unitValue !== undefined && {
          unitValue: payload.unitValue,
        }),
        ...(payload.monthlyPrice !== undefined && {
          monthlyPrice: String(payload.monthlyPrice),
        }),
        ...(payload.yearlyPrice !== undefined && {
          yearlyPrice: String(payload.yearlyPrice),
        }),
        ...(payload.currency !== undefined && { currency: payload.currency }),
        ...(payload.isActive !== undefined && { isActive: payload.isActive }),
        updatedAt: new Date(),
      })
      .where(eq(AddOnModel.id, id))
      .returning();

    if (!updated) {
      throw new HttpError(404, 'Add-on not found');
    }

    return updated;
  }

  /**
   * Delete an add-on (soft delete by deactivating)
   */
  static async deleteAddOn(id: string) {
    const [deleted] = await database
      .update(AddOnModel)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(AddOnModel.id, id))
      .returning();

    if (!deleted) {
      throw new HttpError(404, 'Add-on not found');
    }

    // Invalidate any cached add-on data
    await redisClient.del(`addons:all`);
    await redisClient.del(`addons:active`);

    return deleted;
  }

  /**
   * Get all add-ons (admin view)
   */
  static async getAllAddOns() {
    return await database
      .select()
      .from(AddOnModel)
      .orderBy(asc(AddOnModel.monthlyPrice));
  }

  /**
   * Get all active add-ons (for purchase)
   */
  static async getActiveAddOns() {
    return await database
      .select()
      .from(AddOnModel)
      .where(eq(AddOnModel.isActive, true))
      .orderBy(asc(AddOnModel.monthlyPrice));
  }

  // ==================== Clinic Methods ====================

  /**
   * Get available add-ons for a clinic to purchase
   */
  static async getAvailableAddOns() {
    // Try cache first
    const cacheKey = 'addons:active';
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const addOns = await this.getActiveAddOns();

    // Cache for 5 minutes
    await redisClient.setex(cacheKey, 300, JSON.stringify(addOns));

    return addOns;
  }

  /**
   * Get all add-ons purchased by a clinic
   */
  static async getClinicAddOns(clinicId: string) {
    return await database
      .select()
      .from(ClinicAddOnModel)
      .where(
        and(
          eq(ClinicAddOnModel.clinicId, clinicId),
          eq(ClinicAddOnModel.isActive, true)
        )
      );
  }

  /**
   * Get clinic's add-on limits for all purchased add-ons
   */
  static async getClinicAddOnLimits(clinicId: string) {
    const clinicAddOns = await this.getClinicAddOns(clinicId);
    const limits: Record<
      string,
      { total: number; quantity: number; expiresAt: Date | null }
    > = {};

    for (const clinicAddOn of clinicAddOns) {
      const addOn = await database
        .select()
        .from(AddOnModel)
        .where(eq(AddOnModel.id, clinicAddOn.addOnId))
        .limit(1)
        .then((res) => res[0]);

      if (addOn) {
        const existing = limits[addOn.featureKey] || {
          total: 0,
          quantity: 0,
          expiresAt: null,
        };
        limits[addOn.featureKey] = {
          total: existing.total + addOn.unitValue * clinicAddOn.quantity,
          quantity: existing.quantity + clinicAddOn.quantity,
          expiresAt: clinicAddOn.expiresAt,
        };
      }
    }

    return limits;
  }

  // ==================== Purchase Flow ====================

  /**
   * Get the active subscription's expiry date for a clinic.
   * Used to align add-on expiry with the subscription billing cycle.
   */
  private static async getSubscriptionExpiresAt(
    clinicId: string
  ): Promise<Date | null> {
    const [sub] = await database
      .select({ expiresAt: ClinicSubscriptionModel.expiresAt })
      .from(ClinicSubscriptionModel)
      .where(
        and(
          eq(ClinicSubscriptionModel.clinicId, clinicId),
          eq(ClinicSubscriptionModel.active, true)
        )
      )
      .limit(1);

    return sub?.expiresAt ?? null;
  }

  /**
   * Calculate pro-rated price for an add-on based on remaining days in the billing cycle.
   * Aligns the add-on billing with the subscription renewal date.
   *
   * Formula: (fullPrice / totalDaysInCycle) * remainingDays
   * Minimum charge: 1 day's worth
   */
  static calculateProRatedPrice(
    fullMonthlyPrice: number,
    subscriptionExpiresAt: Date,
    billingCycle: 'monthly' | 'yearly'
  ): { proRatedPrice: number; remainingDays: number; totalDays: number } {
    const now = new Date();
    const expiresAt = new Date(subscriptionExpiresAt);
    const remainingMs = expiresAt.getTime() - now.getTime();
    const remainingDays = Math.max(
      1,
      Math.ceil(remainingMs / (1000 * 60 * 60 * 24))
    );

    const totalDays = billingCycle === 'yearly' ? 365 : 30;
    const fullPrice =
      billingCycle === 'yearly'
        ? fullMonthlyPrice * 12 * 0.9
        : fullMonthlyPrice;

    const dailyRate = fullPrice / totalDays;
    const proRatedPrice = Math.round(dailyRate * remainingDays);

    return { proRatedPrice, remainingDays, totalDays };
  }

  /**
   * Initiate add-on purchase - creates a Razorpay order for one or more add-ons.
   * Price is pro-rated based on remaining days until subscription renewal.
   * Add-on expiry aligns with the subscription expiry date.
   */
  static async initiateAddOnPurchase(
    clinicId: string,
    addOns: {
      addOnId: string;
      billingCycle: 'monthly' | 'yearly';
      quantity: number;
    }[]
  ) {
    // Validate: Clinic must have an active Pro plan to purchase add-ons
    const activeSub = await database
      .select({
        planId: ClinicSubscriptionModel.planId,
        slug: SubscriptionPlanModel.slug,
        expiresAt: ClinicSubscriptionModel.expiresAt,
      })
      .from(ClinicSubscriptionModel)
      .innerJoin(
        SubscriptionPlanModel,
        eq(ClinicSubscriptionModel.planId, SubscriptionPlanModel.id)
      )
      .where(
        and(
          eq(ClinicSubscriptionModel.clinicId, clinicId),
          eq(ClinicSubscriptionModel.active, true)
        )
      )
      .limit(1)
      .then((res) => res[0]);

    if (!activeSub) {
      throw new HttpError(
        403,
        'You must have an active subscription to purchase add-ons'
      );
    }

    if (activeSub.slug === 'Free') {
      throw new HttpError(
        403,
        'Add-ons are only available for Pro plan subscribers. Please upgrade your plan first.'
      );
    }

    // Check expiry of current subscription
    if (activeSub.expiresAt && new Date(activeSub.expiresAt) < new Date()) {
      throw new HttpError(
        403,
        'Your subscription has expired. Please renew your plan before purchasing add-ons.'
      );
    }

    // Subscription expiry date — add-on will expire on the same date
    const subscriptionExpiresAt = activeSub.expiresAt;

    let totalPrice = 0;
    const addOnDetails: {
      id: string;
      name: string;
      featureKey: string;
      unitValue: number;
      quantity: number;
      billingCycle: string;
      fullPrice: number;
      proRatedPrice: number;
      remainingDays: number;
    }[] = [];

    for (const item of addOns) {
      // Get add-on details
      const [addOn] = await database
        .select()
        .from(AddOnModel)
        .where(eq(AddOnModel.id, item.addOnId))
        .limit(1);

      if (!addOn) {
        throw new HttpError(404, `Add-on not found: ${item.addOnId}`);
      }

      if (!addOn.isActive) {
        throw new HttpError(
          400,
          `Add-on "${addOn.name}" is not available for purchase`
        );
      }

      // Calculate pro-rated price aligned with subscription billing cycle
      const fullUnitPrice = getAddOnPrice(addOn.featureKey, item.billingCycle);

      let itemProRatedPrice: number;
      let remainingDays: number;

      if (subscriptionExpiresAt) {
        const proRata = this.calculateProRatedPrice(
          Number(addOn.monthlyPrice),
          subscriptionExpiresAt,
          item.billingCycle
        );
        itemProRatedPrice = proRata.proRatedPrice * item.quantity;
        remainingDays = proRata.remainingDays;
      } else {
        // No expiry (shouldn't happen for paid plans, but fallback)
        itemProRatedPrice = fullUnitPrice * item.quantity;
        remainingDays = item.billingCycle === 'yearly' ? 365 : 30;
      }

      if (itemProRatedPrice <= 0) {
        throw new HttpError(400, `Invalid pricing for add-on "${addOn.name}"`);
      }

      // Check if clinic already has this add-on active — if expired, deactivate it
      const existingAddOn = await database
        .select()
        .from(ClinicAddOnModel)
        .where(
          and(
            eq(ClinicAddOnModel.clinicId, clinicId),
            eq(ClinicAddOnModel.addOnId, item.addOnId),
            eq(ClinicAddOnModel.isActive, true)
          )
        )
        .limit(1)
        .then((res) => res[0]);

      if (existingAddOn) {
        if (
          existingAddOn.expiresAt &&
          new Date(existingAddOn.expiresAt) < new Date()
        ) {
          await database
            .update(ClinicAddOnModel)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(ClinicAddOnModel.id, existingAddOn.id));
        }
      }

      totalPrice += itemProRatedPrice;
      addOnDetails.push({
        id: addOn.id,
        name: addOn.name,
        featureKey: addOn.featureKey,
        unitValue: addOn.unitValue,
        quantity: item.quantity,
        billingCycle: item.billingCycle,
        fullPrice: fullUnitPrice * item.quantity,
        proRatedPrice: itemProRatedPrice,
        remainingDays,
      });
    }

    // Encode the full selection compactly so the webhook can recover the
    // purchase if the frontend verify call never arrives.
    // Format: "addOnId:qty:m|y,addOnId:qty:m|y"
    const addOnItemsEncoded = addOns
      .map(
        (a) =>
          `${a.addOnId}:${a.quantity}:${a.billingCycle === 'yearly' ? 'y' : 'm'}`
      )
      .join(',');

    // Create single Razorpay order for total amount
    const order = await createRazorpayOrder(
      totalPrice,
      clinicId,
      addOnDetails.map((a) => a.id).join(','),
      'addon-purchase',
      { addOnItems: addOnItemsEncoded }
    );

    return {
      orderId: order.id,
      amount: totalPrice,
      currency: 'INR',
      addOns: addOnDetails,
    };
  }

  /**
   * Complete purchase after payment (called internally after verification).
   * Add-on expiry is aligned with the subscription expiry date (pro-rated billing).
   */
  static async completePurchase(
    clinicId: string,
    addOns: {
      addOnId: string;
      billingCycle: 'monthly' | 'yearly';
      quantity: number;
    }[],
    transactionId: string,
    orderId: string
  ) {
    // Idempotency: if this payment was already processed (e.g. the frontend
    // verify call ran and then the webhook fired, or vice-versa), do nothing.
    const alreadyProcessed = await database
      .select({ id: ClinicAddOnModel.id })
      .from(ClinicAddOnModel)
      .where(eq(ClinicAddOnModel.transactionId, transactionId))
      .limit(1);

    if (alreadyProcessed.length > 0) {
      return alreadyProcessed.map((row) => ({
        clinicAddOn: row,
        addOnName: '',
        featureKey: '',
        expiresAt: null as Date | null,
      }));
    }

    const purchaseResults = await database.transaction(async (tx) => {
      // Validate Pro plan requirement and get subscription expiry
      const [activeSub] = await tx
        .select({
          slug: SubscriptionPlanModel.slug,
          expiresAt: ClinicSubscriptionModel.expiresAt,
        })
        .from(ClinicSubscriptionModel)
        .innerJoin(
          SubscriptionPlanModel,
          eq(ClinicSubscriptionModel.planId, SubscriptionPlanModel.id)
        )
        .where(
          and(
            eq(ClinicSubscriptionModel.clinicId, clinicId),
            eq(ClinicSubscriptionModel.active, true)
          )
        )
        .limit(1);

      if (!activeSub || activeSub.slug === 'Free') {
        throw new HttpError(
          403,
          'Add-ons are only available for Pro plan subscribers'
        );
      }

      const results = [];

      for (const item of addOns) {
        // Get add-on details
        const [addOn] = await tx
          .select()
          .from(AddOnModel)
          .where(eq(AddOnModel.id, item.addOnId))
          .limit(1);

        if (!addOn) {
          throw new HttpError(404, `Add-on not found: ${item.addOnId}`);
        }

        // Align expiry with subscription expiry (pro-rated billing)
        const startsAt = new Date();
        let expiresAt: Date;

        if (activeSub.expiresAt) {
          // Align with subscription renewal date
          expiresAt = new Date(activeSub.expiresAt);
        } else {
          // Fallback: standard duration
          expiresAt =
            item.billingCycle === 'yearly'
              ? addDays(startsAt, 365)
              : addDays(startsAt, 30);
        }

        // Calculate pro-rated price
        let totalPrice: number;
        if (activeSub.expiresAt) {
          const proRata = AddOnService.calculateProRatedPrice(
            Number(addOn.monthlyPrice),
            activeSub.expiresAt,
            item.billingCycle
          );
          totalPrice = proRata.proRatedPrice * item.quantity;
        } else {
          const unitPrice = getAddOnPrice(addOn.featureKey, item.billingCycle);
          totalPrice = unitPrice * item.quantity;
        }

        // Create clinic add-on record
        const [clinicAddOn] = await tx
          .insert(ClinicAddOnModel)
          .values({
            clinicId,
            addOnId: item.addOnId,
            quantity: item.quantity,
            billingCycle: item.billingCycle,
            startsAt,
            expiresAt,
            isActive: true,
            provider: 'razorpay',
            providerSubscriptionId: orderId,
            paymentStatus: 'success',
            paymentMode: 'razorpay',
            transactionId,
            price: String(totalPrice),
          })
          .returning();

        results.push({
          clinicAddOn,
          addOnName: addOn.name,
          featureKey: addOn.featureKey,
          expiresAt,
        });
      }

      // Invalidate clinic cache
      await redisClient.del(`clinic_addons:${clinicId}`);
      await redisClient.del(`clinic_limits:${clinicId}`);
      await redisClient.del(`clinic_limits_overview:${clinicId}`);

      return results;
    });

    // If AutoPay is on, update the recurring mandate to include the new add-ons
    // from the next cycle onward (best-effort — never blocks the purchase).
    const { AutoRenewService } = await import('./autoRenew.service');
    await AutoRenewService.syncAutoRenewAmount(clinicId);

    return purchaseResults;
  }

  /**
   * Schedule an add-on cancellation at end of its billing period.
   * Add-on stays active until expiresAt, then won't renew.
   */
  static async scheduleCancelAddOn(
    clinicAddOnId: string,
    clinicId: string,
    reason?: string
  ) {
    const [clinicAddOn] = await database
      .select()
      .from(ClinicAddOnModel)
      .where(
        and(
          eq(ClinicAddOnModel.id, clinicAddOnId),
          eq(ClinicAddOnModel.clinicId, clinicId),
          eq(ClinicAddOnModel.isActive, true)
        )
      )
      .limit(1);

    if (!clinicAddOn) {
      throw new HttpError(404, 'Active add-on not found');
    }

    const [updated] = await database
      .update(ClinicAddOnModel)
      .set({
        cancelAtPeriodEnd: true,
        cancelledAt: new Date(),
        cancellationReason: reason || null,
        updatedAt: new Date(),
      })
      .where(eq(ClinicAddOnModel.id, clinicAddOnId))
      .returning();

    // Invalidate cache
    await redisClient.del(`clinic_addons:${clinicId}`);
    await redisClient.del(`clinic_limits:${clinicId}`);
    await redisClient.del(`clinic_limits_overview:${clinicId}`);

    // Scheduled-for-removal add-ons drop out of the next recurring charge.
    const { AutoRenewService } = await import('./autoRenew.service');
    await AutoRenewService.syncAutoRenewAmount(clinicId);

    return updated;
  }

  /**
   * Undo a scheduled add-on cancellation (re-enable renewal).
   */
  static async undoCancelAddOn(clinicAddOnId: string, clinicId: string) {
    const [clinicAddOn] = await database
      .select()
      .from(ClinicAddOnModel)
      .where(
        and(
          eq(ClinicAddOnModel.id, clinicAddOnId),
          eq(ClinicAddOnModel.clinicId, clinicId),
          eq(ClinicAddOnModel.isActive, true),
          eq(ClinicAddOnModel.cancelAtPeriodEnd, true)
        )
      )
      .limit(1);

    if (!clinicAddOn) {
      throw new HttpError(404, 'No add-on with pending cancellation found');
    }

    const [updated] = await database
      .update(ClinicAddOnModel)
      .set({
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        cancellationReason: null,
        updatedAt: new Date(),
      })
      .where(eq(ClinicAddOnModel.id, clinicAddOnId))
      .returning();

    // Invalidate cache
    await redisClient.del(`clinic_addons:${clinicId}`);
    await redisClient.del(`clinic_limits:${clinicId}`);
    await redisClient.del(`clinic_limits_overview:${clinicId}`);

    // Add-on is renewing again — restore it in the next recurring charge.
    const { AutoRenewService } = await import('./autoRenew.service');
    await AutoRenewService.syncAutoRenewAmount(clinicId);

    return updated;
  }

  /**
   * Cancel a clinic's add-on subscription (immediate)
   */
  static async cancelAddOn(clinicAddOnId: string) {
    const [updated] = await database
      .update(ClinicAddOnModel)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(ClinicAddOnModel.id, clinicAddOnId))
      .returning();

    if (!updated) {
      throw new HttpError(404, 'Clinic add-on not found');
    }

    // Invalidate clinic cache
    await redisClient.del(`clinic_addons:${updated.clinicId}`);
    await redisClient.del(`clinic_limits:${updated.clinicId}`);
    await redisClient.del(`clinic_limits_overview:${updated.clinicId}`);

    const { AutoRenewService } = await import('./autoRenew.service');
    await AutoRenewService.syncAutoRenewAmount(updated.clinicId);

    return updated;
  }

  /**
   * Reduce the quantity of an active add-on.
   * If quantity reaches 0, the add-on is deactivated.
   * Takes effect immediately (limit reduced right away).
   */
  static async reduceAddOnQuantity(
    clinicAddOnId: string,
    clinicId: string,
    reduceBy: number = 1
  ) {
    const [clinicAddOn] = await database
      .select()
      .from(ClinicAddOnModel)
      .where(
        and(
          eq(ClinicAddOnModel.id, clinicAddOnId),
          eq(ClinicAddOnModel.clinicId, clinicId),
          eq(ClinicAddOnModel.isActive, true)
        )
      )
      .limit(1);

    if (!clinicAddOn) {
      throw new HttpError(404, 'Active add-on not found');
    }

    if (reduceBy < 1) {
      throw new HttpError(400, 'Reduce amount must be at least 1');
    }

    const newQuantity = clinicAddOn.quantity - reduceBy;

    if (newQuantity <= 0) {
      // Deactivate entirely
      const [updated] = await database
        .update(ClinicAddOnModel)
        .set({
          quantity: 0,
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(ClinicAddOnModel.id, clinicAddOnId))
        .returning();

      await redisClient.del(`clinic_addons:${clinicId}`);
      await redisClient.del(`clinic_limits:${clinicId}`);
      await redisClient.del(`clinic_limits_overview:${clinicId}`);

      const { AutoRenewService } = await import('./autoRenew.service');
      await AutoRenewService.syncAutoRenewAmount(clinicId);

      return { ...updated, removed: true };
    }

    // Reduce quantity and adjust price proportionally
    const pricePerUnit = Number(clinicAddOn.price) / clinicAddOn.quantity;
    const newPrice = Math.round(pricePerUnit * newQuantity);

    const [updated] = await database
      .update(ClinicAddOnModel)
      .set({
        quantity: newQuantity,
        price: String(newPrice),
        updatedAt: new Date(),
      })
      .where(eq(ClinicAddOnModel.id, clinicAddOnId))
      .returning();

    await redisClient.del(`clinic_addons:${clinicId}`);
    await redisClient.del(`clinic_limits:${clinicId}`);
    await redisClient.del(`clinic_limits_overview:${clinicId}`);

    const { AutoRenewService } = await import('./autoRenew.service');
    await AutoRenewService.syncAutoRenewAmount(clinicId);

    return { ...updated, removed: false };
  }

  // ==================== Limit Calculation Helpers ====================

  /**
   * Calculate total limit for a feature by summing base plan + all active add-ons
   */
  static async calculateTotalLimit(
    clinicId: string,
    featureKey: string
  ): Promise<number> {
    // This method would be called by LimitationService to get add-on contributions
    // Return the sum of unit values from all active add-ons for this feature

    const addOns = await database
      .select({
        unitValue: AddOnModel.unitValue,
        quantity: ClinicAddOnModel.quantity,
        expiresAt: ClinicAddOnModel.expiresAt,
      })
      .from(ClinicAddOnModel)
      .innerJoin(AddOnModel, eq(ClinicAddOnModel.addOnId, AddOnModel.id))
      .where(
        and(
          eq(ClinicAddOnModel.clinicId, clinicId),
          eq(ClinicAddOnModel.isActive, true),
          eq(AddOnModel.featureKey, featureKey)
        )
      );

    const now = new Date();
    let totalAddOnValue = 0;

    for (const addOn of addOns) {
      // Only count if not expired or no expiry
      if (!addOn.expiresAt || new Date(addOn.expiresAt) > now) {
        totalAddOnValue += (addOn.unitValue || 1) * (addOn.quantity || 1);
      }
    }

    return totalAddOnValue;
  }

  /**
   * Recalculate and update expiry date for a clinic's add-on
   * (useful for renewal flows)
   */
  static async recalculateExpiryDate(clinicId: string, addOnId: string) {
    const [clinicAddOn] = await database
      .select()
      .from(ClinicAddOnModel)
      .where(
        and(
          eq(ClinicAddOnModel.clinicId, clinicId),
          eq(ClinicAddOnModel.addOnId, addOnId),
          eq(ClinicAddOnModel.isActive, true)
        )
      )
      .limit(1);

    if (!clinicAddOn) {
      throw new HttpError(404, 'Clinic add-on not found');
    }

    const startsAt = new Date();
    const billingCycle = clinicAddOn.billingCycle as 'monthly' | 'yearly';
    const expiresAt =
      billingCycle === 'yearly'
        ? addDays(startsAt, 365)
        : addDays(startsAt, 30);

    await database
      .update(ClinicAddOnModel)
      .set({
        startsAt,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(ClinicAddOnModel.id, clinicAddOn.id));

    // Invalidate cache
    await redisClient.del(`clinic_addons:${clinicId}`);
    await redisClient.del(`clinic_limits:${clinicId}`);
    await redisClient.del(`clinic_limits_overview:${clinicId}`);

    return { expiresAt };
  }
}

// Export pricing constants for reference
export { ADD_ON_PRICING };
