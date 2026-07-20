// src/main/subscription/services/limitation.service.ts
import { and, eq, gte, isNull, lte, or, sql } from 'drizzle-orm';
import { AddOnModel, ClinicAddOnModel } from '../models/addon.model';

// Placeholder for AddOnService - actual implementation will be linked
// import { AddOnService } from './addon.service'
import { database } from '../../../configurations/dbConnection';
import redisClient from '../../../configurations/redisConfig';
import { ClinicAssignModel } from '../../clinic/models/clinic.model';
import {
  ClinicSubscriptionModel,
  SubscriptionPlanModel,
} from '../models/subscription.model';
import { ClinicUsageModel } from '../models/clinicUsage.model';
import { PlanFeaturesModel } from '../models/planFeatures.model';
import { UserModel } from '../../users/models/user.model';

/** Feature keys used across the system */
export const FEATURE_KEYS = {
  WHATSAPP_MESSAGES: 'whatsapp_messages_per_month',
  DOCTOR_ACCOUNTS: 'doctor_accounts',
  RECEPTIONIST_ACCOUNTS: 'receptionist_accounts',
  STAFF_ACCOUNTS: 'staff_accounts',
  STORAGE_MONTHS: 'storage_months',
  PAYMENT_HISTORY_MONTHS: 'payment_history_months',
  LAB_INTEGRATION: 'lab_integration',
  PHARMACY_INTEGRATION: 'pharmacy_integration',
  DASHBOARD_FULL_ACCESS: 'dashboard_full_access',
  REPORTS_ANALYTICS: 'reports_analytics',
  SMART_PRESCRIPTIONS: 'smart_prescriptions',
  PRIORITY_SUPPORT: 'priority_support',
} as const;

/**
 * User types that count as "staff" (everything except Admin and Doctor).
 * Used for the unified staff_accounts limit enforcement.
 */
export const STAFF_USER_TYPES = [
  'Receptionist',
  'Nurse',
  'Pharmacist',
  'Lab_Assistant',
  'Radiologist',
] as const;

export type StaffUserType = (typeof STAFF_USER_TYPES)[number];

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];

export interface PlanLimit {
  featureKey: string;
  limitValue: number | null;
  isUnlimited: boolean;
  enabled: boolean;
}

export interface TotalLimitResult {
  baseLimit: number;
  addOnLimit: number;
  totalLimit: number;
}

export interface UsageCheckResult {
  allowed: boolean;
  currentUsage: number;
  limit: number | null;
  isUnlimited: boolean;
  remaining: number | null;
  message?: string;
}

export interface FeatureCheckResult {
  allowed: boolean;
  message?: string;
}

export class LimitationService {
  private static CACHE_TTL = 300; // 5 minutes

  /**
   * Get the active plan for a clinic
   */
  static async getClinicActivePlan(
    clinicId: string
  ): Promise<{ planId: string; planSlug: string } | null> {
    const cacheKey = `clinic_plan:${clinicId}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const now = new Date();

    const [sub] = await database
      .select({
        planId: ClinicSubscriptionModel.planId,
        planSlug: SubscriptionPlanModel.slug,
      })
      .from(ClinicSubscriptionModel)
      .innerJoin(
        SubscriptionPlanModel,
        eq(SubscriptionPlanModel.id, ClinicSubscriptionModel.planId)
      )
      .where(
        and(
          eq(ClinicSubscriptionModel.clinicId, clinicId),
          eq(ClinicSubscriptionModel.active, true)
        )
      )
      .limit(1);

    if (!sub) {
      // No active subscription → treat as free plan
      const [freePlan] = await database
        .select({
          id: SubscriptionPlanModel.id,
          slug: SubscriptionPlanModel.slug,
        })
        .from(SubscriptionPlanModel)
        .where(eq(SubscriptionPlanModel.slug, 'Free'))
        .limit(1);

      if (freePlan) {
        const result = { planId: freePlan.id, planSlug: freePlan.slug };
        await redisClient.setex(
          cacheKey,
          this.CACHE_TTL,
          JSON.stringify(result)
        );
        return result;
      }
      return null;
    }

    // Check expiry
    if (sub.planSlug !== 'Free') {
      const activeSub = await database
        .select()
        .from(ClinicSubscriptionModel)
        .where(
          and(
            eq(ClinicSubscriptionModel.clinicId, clinicId),
            eq(ClinicSubscriptionModel.active, true)
          )
        )
        .limit(1);

      if (activeSub.length > 0 && activeSub[0].expiresAt) {
        if (new Date(activeSub[0].expiresAt) < now) {
          // Expired → fall back to free plan
          const [freePlan] = await database
            .select({
              id: SubscriptionPlanModel.id,
              slug: SubscriptionPlanModel.slug,
            })
            .from(SubscriptionPlanModel)
            .where(eq(SubscriptionPlanModel.slug, 'Free'))
            .limit(1);

          if (freePlan) {
            const result = { planId: freePlan.id, planSlug: freePlan.slug };
            await redisClient.setex(
              cacheKey,
              this.CACHE_TTL,
              JSON.stringify(result)
            );

            // Trigger staff enforcement ONCE on expiry detection.
            // Use a Redis flag to avoid running enforcement on every request.
            const enforcementKey = `staff_enforcement_done:${clinicId}`;
            const alreadyEnforced = await redisClient.get(enforcementKey);

            if (!alreadyEnforced) {
              // Mark as enforced (24h TTL — enforcement will re-run if key expires and plan is still expired)
              await redisClient.setex(enforcementKey, 86400, '1');

              // Run enforcement asynchronously to not block the current request
              setImmediate(() => {
                this.enforceStaffLimitsOnExpiry(clinicId).catch(() => {
                  // If enforcement fails, remove the flag so it retries next time
                  redisClient.del(enforcementKey).catch(() => {});
                });
              });
            }

            return result;
          }
          return null;
        }
      }
    }

    const result = { planId: sub.planId, planSlug: sub.planSlug };
    await redisClient.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));
    return result;
  }

  /**
   * Get the limit configuration for a specific feature on a plan
   */
  static async getPlanLimit(
    planId: string,
    featureKey: FeatureKey
  ): Promise<PlanLimit | null> {
    const cacheKey = `plan_limit:${planId}:${featureKey}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const [limit] = await database
      .select({
        featureKey: PlanFeaturesModel.featureKey,
        limitValue: PlanFeaturesModel.limitValue,
        isUnlimited: PlanFeaturesModel.isUnlimited,
        enabled: PlanFeaturesModel.enabled,
      })
      .from(PlanFeaturesModel)
      .where(
        and(
          eq(PlanFeaturesModel.planId, planId),
          eq(PlanFeaturesModel.featureKey, featureKey)
        )
      )
      .limit(1);

    if (!limit) return null;

    await redisClient.setex(cacheKey, this.CACHE_TTL, JSON.stringify(limit));
    return limit;
  }

  /**
   * Check if a boolean feature is enabled for a clinic's plan
   */
  static async isFeatureEnabled(
    clinicId: string,
    featureKey: FeatureKey
  ): Promise<FeatureCheckResult> {
    const plan = await this.getClinicActivePlan(clinicId);

    if (!plan) {
      // No plan configured → allow (limitation system not seeded yet)
      return { allowed: true };
    }

    const limit = await this.getPlanLimit(plan.planId, featureKey);

    if (!limit) {
      // If no limit is defined, feature is not available
      return {
        allowed: false,
        message: `This feature is not available on your current plan (${plan.planSlug}).`,
      };
    }

    if (!limit.enabled) {
      return {
        allowed: false,
        message: `This feature is not available on the ${plan.planSlug} plan. Please upgrade to access this feature.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Get current period boundaries (monthly)
   */
  static getCurrentPeriod(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );
    return { start, end };
  }

  /**
   * Get current usage for a clinic feature in the current period
   */
  static async getCurrentUsage(
    clinicId: string,
    featureKey: FeatureKey
  ): Promise<number> {
    const { start, end } = this.getCurrentPeriod();

    const [usage] = await database
      .select({ usageCount: ClinicUsageModel.usageCount })
      .from(ClinicUsageModel)
      .where(
        and(
          eq(ClinicUsageModel.clinicId, clinicId),
          eq(ClinicUsageModel.featureKey, featureKey),
          gte(ClinicUsageModel.periodStart, start),
          lte(ClinicUsageModel.periodEnd, end)
        )
      )
      .limit(1);

    return usage?.usageCount ?? 0;
  }

  /**
   * Check if a usage-based feature is within limits
   */
  static async checkUsageLimit(
    clinicId: string,
    featureKey: FeatureKey
  ): Promise<UsageCheckResult> {
    const plan = await this.getClinicActivePlan(clinicId);

    if (!plan) {
      // No plan configured → allow (limitation system not seeded yet)
      return {
        allowed: true,
        currentUsage: 0,
        limit: null,
        isUnlimited: true,
        remaining: null,
      };
    }

    const limit = await this.getPlanLimit(plan.planId, featureKey);

    if (!limit) {
      // Limit not configured → allow
      return {
        allowed: true,
        currentUsage: 0,
        limit: null,
        isUnlimited: true,
        remaining: null,
      };
    }

    if (!limit.enabled) {
      return {
        allowed: false,
        currentUsage: 0,
        limit: 0,
        isUnlimited: false,
        remaining: 0,
        message: `This feature is not available on the ${plan.planSlug} plan.`,
      };
    }

    if (limit.isUnlimited) {
      const currentUsage = await this.getCurrentUsage(clinicId, featureKey);
      return {
        allowed: true,
        currentUsage,
        limit: null,
        isUnlimited: true,
        remaining: null,
      };
    }

    const currentUsage = await this.getCurrentUsage(clinicId, featureKey);
    const limitValue = limit.limitValue ?? 0;
    const remaining = Math.max(0, limitValue - currentUsage);

    if (currentUsage >= limitValue) {
      return {
        allowed: false,
        currentUsage,
        limit: limitValue,
        isUnlimited: false,
        remaining: 0,
        message: `You have reached your ${plan.planSlug} plan limit of ${limitValue} for this feature. Please upgrade your plan.`,
      };
    }

    return {
      allowed: true,
      currentUsage,
      limit: limitValue,
      isUnlimited: false,
      remaining,
    };
  }

  /**
   * Increment usage counter for a clinic feature
   */
  static async incrementUsage(
    clinicId: string,
    featureKey: FeatureKey,
    incrementBy: number = 1
  ): Promise<void> {
    const { start, end } = this.getCurrentPeriod();

    await database
      .insert(ClinicUsageModel)
      .values({
        clinicId,
        featureKey,
        usageCount: incrementBy,
        periodStart: start,
        periodEnd: end,
      })
      .onConflictDoUpdate({
        target: [
          ClinicUsageModel.clinicId,
          ClinicUsageModel.featureKey,
          ClinicUsageModel.periodStart,
        ],
        set: {
          usageCount: sql`${ClinicUsageModel.usageCount} + ${incrementBy}`,
          updatedAt: new Date(),
        },
      });
  }

  /**
   * Get additional limit from active add-ons for a feature
   */
  static async getAddOnLimit(
    clinicId: string,
    featureKey: string
  ): Promise<number> {
    const now = new Date();

    const addOns = await database
      .select({
        unitValue: AddOnModel.unitValue,
        quantity: ClinicAddOnModel.quantity,
      })
      .from(ClinicAddOnModel)
      .innerJoin(AddOnModel, eq(ClinicAddOnModel.addOnId, AddOnModel.id))
      .where(
        and(
          eq(ClinicAddOnModel.clinicId, clinicId),
          eq(AddOnModel.featureKey, featureKey),
          eq(ClinicAddOnModel.isActive, true),
          or(
            isNull(ClinicAddOnModel.expiresAt),
            gte(ClinicAddOnModel.expiresAt, now)
          )
        )
      );

    return addOns.reduce(
      (sum, addOn) => sum + (addOn.unitValue ?? 0) * (addOn.quantity ?? 0),
      0
    );
  }

  /**
   * Maps a plan feature key to the add-on feature key(s) that contribute to it.
   *
   * The `add_ons` table stores doctor/staff capacity under different feature keys
   * (e.g. `additional_doctor`, `additional_staff`) than the `plan_features` table
   * (`doctor_accounts`, `staff_accounts`). This map bridges the two so purchased
   * add-ons are correctly counted toward the relevant account limit.
   */
  private static readonly ACCOUNT_ADDON_KEYS: Record<string, string[]> = {
    [FEATURE_KEYS.DOCTOR_ACCOUNTS]: [
      'additional_doctor',
      FEATURE_KEYS.DOCTOR_ACCOUNTS,
    ],
    [FEATURE_KEYS.STAFF_ACCOUNTS]: [
      'additional_staff',
      FEATURE_KEYS.STAFF_ACCOUNTS,
      FEATURE_KEYS.RECEPTIONIST_ACCOUNTS,
    ],
    [FEATURE_KEYS.RECEPTIONIST_ACCOUNTS]: [
      'additional_staff',
      FEATURE_KEYS.STAFF_ACCOUNTS,
      FEATURE_KEYS.RECEPTIONIST_ACCOUNTS,
    ],
  };

  /**
   * Get the combined add-on limit for an account-based plan feature, summing
   * across every add-on feature key that maps to it. Falls back to a direct
   * lookup for features without a mapping.
   */
  static async getAccountAddOnLimit(
    clinicId: string,
    planFeatureKey: string
  ): Promise<number> {
    const addOnKeys = this.ACCOUNT_ADDON_KEYS[planFeatureKey] ?? [
      planFeatureKey,
    ];

    // De-duplicate to avoid double counting if keys overlap
    const uniqueKeys = Array.from(new Set(addOnKeys));

    const limits = await Promise.all(
      uniqueKeys.map((key) => this.getAddOnLimit(clinicId, key))
    );

    return limits.reduce((sum, value) => sum + value, 0);
  }

  /**
   * Get total limit (plan + add-ons) for a feature
   */
  static async getTotalLimit(
    clinicId: string,
    featureKey: FeatureKey
  ): Promise<TotalLimitResult> {
    const plan = await this.getClinicActivePlan(clinicId);

    let baseLimit = 0;

    if (plan) {
      const limit = await this.getPlanLimit(plan.planId, featureKey);
      if (limit && limit.enabled && !limit.isUnlimited) {
        baseLimit = limit.limitValue ?? 0;
      }
    }

    const addOnLimit = await this.getAddOnLimit(clinicId, featureKey);

    return {
      baseLimit,
      addOnLimit,
      totalLimit: baseLimit + addOnLimit,
    };
  }

  /**
   * Check doctor account limit for a clinic
   */
  static async checkDoctorLimit(clinicId: string): Promise<UsageCheckResult> {
    const plan = await this.getClinicActivePlan(clinicId);

    if (!plan) {
      // No plan configured → allow (don't block if limitation system isn't seeded)
      return {
        allowed: true,
        currentUsage: 0,
        limit: null,
        isUnlimited: true,
        remaining: null,
        message: undefined,
      };
    }

    const limit = await this.getPlanLimit(
      plan.planId,
      FEATURE_KEYS.DOCTOR_ACCOUNTS
    );

    if (!limit) {
      // Limit not configured for this plan → allow
      return {
        allowed: true,
        currentUsage: 0,
        limit: null,
        isUnlimited: true,
        remaining: null,
      };
    }

    if (!limit.enabled) {
      return {
        allowed: false,
        currentUsage: 0,
        limit: 0,
        isUnlimited: false,
        remaining: 0,
        message: 'Doctor accounts feature is not configured.',
      };
    }

    if (limit.isUnlimited) {
      return {
        allowed: true,
        currentUsage: 0,
        limit: null,
        isUnlimited: true,
        remaining: null,
      };
    }

    // Count current doctors assigned to this clinic (Doctor + Admin with doctor access)
    const doctorCount = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(ClinicAssignModel)
      .innerJoin(UserModel, eq(UserModel.id, ClinicAssignModel.userId))
      .where(
        and(
          eq(ClinicAssignModel.clinicId, clinicId),
          or(
            eq(UserModel.userType, 'Doctor'),
            and(
              eq(UserModel.userType, 'Admin'),
              eq(UserModel.isAdminDoctorAccess, true)
            )
          )
        )
      );

    const currentCount = doctorCount[0]?.count ?? 0;
    const baseLimitValue = limit.limitValue ?? 0;
    const addOnLimit = await this.getAccountAddOnLimit(
      clinicId,
      FEATURE_KEYS.DOCTOR_ACCOUNTS
    );
    const totalLimit = baseLimitValue + addOnLimit;
    const remaining = Math.max(0, totalLimit - currentCount);

    return {
      allowed: currentCount < totalLimit,
      currentUsage: currentCount,
      limit: totalLimit,
      isUnlimited: false,
      remaining,
      message:
        currentCount >= totalLimit
          ? `You have reached the maximum of ${totalLimit} doctor(s) on your ${plan.planSlug} plan. Please upgrade to add more doctors.`
          : undefined,
    };
  }

  /**
   * Check receptionist account limit for a clinic
   * @deprecated Use checkStaffLimit() instead — receptionists are part of the unified staff limit
   */
  static async checkReceptionistLimit(
    clinicId: string
  ): Promise<UsageCheckResult> {
    // Delegate to the unified staff limit check
    return this.checkStaffLimit(clinicId);
  }

  /**
   * Count all staff members (non-Admin, non-Doctor) assigned to a clinic.
   * Staff includes: Receptionist, Nurse, Pharmacist, Lab_Assistant, Radiologist
   */
  static async getStaffCount(clinicId: string): Promise<number> {
    const staffCount = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(ClinicAssignModel)
      .innerJoin(UserModel, eq(UserModel.id, ClinicAssignModel.userId))
      .where(
        and(
          eq(ClinicAssignModel.clinicId, clinicId),
          or(
            eq(UserModel.userType, 'Receptionist'),
            eq(UserModel.userType, 'Nurse'),
            eq(UserModel.userType, 'Pharmacist'),
            eq(UserModel.userType, 'Lab_Assistant'),
            eq(UserModel.userType, 'Radiologist')
          )
        )
      );

    return staffCount[0]?.count ?? 0;
  }

  /**
   * Check unified staff account limit for a clinic.
   * All non-Admin, non-Doctor users (Receptionist, Nurse, Pharmacist, Lab_Assistant, Radiologist)
   * share a single "staff_accounts" pool.
   *
   * Falls back to "receptionist_accounts" if "staff_accounts" feature key isn't seeded yet,
   * ensuring backward compatibility.
   */
  static async checkStaffLimit(clinicId: string): Promise<UsageCheckResult> {
    const plan = await this.getClinicActivePlan(clinicId);

    if (!plan) {
      return {
        allowed: true,
        currentUsage: 0,
        limit: null,
        isUnlimited: true,
        remaining: null,
        message: undefined,
      };
    }

    // Try "staff_accounts" first, fall back to "receptionist_accounts" for backward compatibility
    let limit = await this.getPlanLimit(
      plan.planId,
      FEATURE_KEYS.STAFF_ACCOUNTS
    );

    if (!limit) {
      // Fallback: use receptionist_accounts if staff_accounts not yet seeded
      limit = await this.getPlanLimit(
        plan.planId,
        FEATURE_KEYS.RECEPTIONIST_ACCOUNTS
      );
    }

    if (!limit) {
      return {
        allowed: true,
        currentUsage: 0,
        limit: null,
        isUnlimited: true,
        remaining: null,
      };
    }

    if (!limit.enabled) {
      return {
        allowed: false,
        currentUsage: 0,
        limit: 0,
        isUnlimited: false,
        remaining: 0,
        message: 'Staff accounts feature is not configured for your plan.',
      };
    }

    if (limit.isUnlimited) {
      return {
        allowed: true,
        currentUsage: 0,
        limit: null,
        isUnlimited: true,
        remaining: null,
      };
    }

    // Count ALL staff (not just receptionists)
    const currentCount = await this.getStaffCount(clinicId);
    const baseLimitValue = limit.limitValue ?? 0;

    // Sum add-on contributions across all staff-related feature keys
    const addOnLimit = await this.getAccountAddOnLimit(
      clinicId,
      FEATURE_KEYS.STAFF_ACCOUNTS
    );

    const totalLimit = baseLimitValue + addOnLimit;
    const remaining = Math.max(0, totalLimit - currentCount);

    return {
      allowed: currentCount < totalLimit,
      currentUsage: currentCount,
      limit: totalLimit,
      isUnlimited: false,
      remaining,
      message:
        currentCount >= totalLimit
          ? `You have reached the maximum of ${totalLimit} staff member(s) on your ${plan.planSlug} plan. Please upgrade or purchase an add-on to add more staff.`
          : undefined,
    };
  }

  /**
   * Check if a specific feature prerequisite is met before adding a staff member.
   * E.g., Lab_Assistant requires lab_integration, Pharmacist requires pharmacy_integration.
   */
  static async checkStaffFeaturePrerequisite(
    clinicId: string,
    userType: string
  ): Promise<FeatureCheckResult> {
    const featureMap: Record<string, FeatureKey> = {
      Lab_Assistant: FEATURE_KEYS.LAB_INTEGRATION,
      Pharmacist: FEATURE_KEYS.PHARMACY_INTEGRATION,
    };

    const requiredFeature = featureMap[userType];

    if (!requiredFeature) {
      // No prerequisite feature required for this user type
      return { allowed: true };
    }

    return this.isFeatureEnabled(clinicId, requiredFeature);
  }

  /**
   * Get staff members exceeding the current plan limit (useful for downgrade warnings).
   * Returns the count of staff that exceed the limit, or 0 if within limits.
   */
  static async getStaffOverLimitCount(clinicId: string): Promise<{
    overLimit: boolean;
    currentCount: number;
    allowedCount: number;
    excessCount: number;
  }> {
    const result = await this.checkStaffLimit(clinicId);

    if (result.isUnlimited || result.limit === null) {
      return {
        overLimit: false,
        currentCount: result.currentUsage,
        allowedCount: -1,
        excessCount: 0,
      };
    }

    const excess = Math.max(0, result.currentUsage - result.limit);

    return {
      overLimit: excess > 0,
      currentCount: result.currentUsage,
      allowedCount: result.limit,
      excessCount: excess,
    };
  }

  /**
   * Get storage retention months for a clinic's plan
   */
  static async getStorageRetentionMonths(clinicId: string): Promise<number> {
    const plan = await this.getClinicActivePlan(clinicId);

    if (!plan) return 3; // Default to free plan limit

    const limit = await this.getPlanLimit(
      plan.planId,
      FEATURE_KEYS.STORAGE_MONTHS
    );

    if (!limit || !limit.enabled) return 3;
    if (limit.isUnlimited) return -1; // -1 means unlimited
    return limit.limitValue ?? 3;
  }

  /**
   * Get payment history retention months for a clinic's plan
   */
  static async getPaymentHistoryMonths(clinicId: string): Promise<number> {
    const plan = await this.getClinicActivePlan(clinicId);

    if (!plan) return 3; // Default to free plan limit

    const limit = await this.getPlanLimit(
      plan.planId,
      FEATURE_KEYS.PAYMENT_HISTORY_MONTHS
    );

    if (!limit || !limit.enabled) return 3;
    if (limit.isUnlimited) return -1; // -1 means unlimited
    return limit.limitValue ?? 3;
  }

  /**
   * Get all limits and usage summary for a clinic (for dashboard/info endpoint)
   * Includes real-time counts for doctors/receptionists and caches the result.
   */
  static async getClinicLimitsOverview(clinicId: string) {
    // Check Redis cache first
    const cacheKey = `clinic_limits_overview:${clinicId}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const plan = await this.getClinicActivePlan(clinicId);

    if (!plan) {
      return { plan: null, limits: [] };
    }

    const limits = await database
      .select()
      .from(PlanFeaturesModel)
      .where(eq(PlanFeaturesModel.planId, plan.planId));

    const { start, end } = this.getCurrentPeriod();

    // Get usage-based counters (WhatsApp messages, etc.)
    const usages = await database
      .select()
      .from(ClinicUsageModel)
      .where(
        and(
          eq(ClinicUsageModel.clinicId, clinicId),
          gte(ClinicUsageModel.periodStart, start),
          lte(ClinicUsageModel.periodEnd, end)
        )
      );

    const usageMap = new Map(usages.map((u) => [u.featureKey, u.usageCount]));

    // Get real-time doctor count (Doctor + Admin with doctor access)
    const [doctorCountResult] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(ClinicAssignModel)
      .innerJoin(UserModel, eq(UserModel.id, ClinicAssignModel.userId))
      .where(
        and(
          eq(ClinicAssignModel.clinicId, clinicId),
          or(
            eq(UserModel.userType, 'Doctor'),
            and(
              eq(UserModel.userType, 'Admin'),
              eq(UserModel.isAdminDoctorAccess, true)
            )
          )
        )
      );

    // Get real-time staff count (all non-Admin, non-Doctor)
    const staffCount = await this.getStaffCount(clinicId);

    const doctorCount = doctorCountResult?.count ?? 0;

    // Map of feature keys to their real-time counts
    const realTimeCountMap: Record<string, number> = {
      [FEATURE_KEYS.DOCTOR_ACCOUNTS]: doctorCount,
      [FEATURE_KEYS.RECEPTIONIST_ACCOUNTS]: staffCount,
      [FEATURE_KEYS.STAFF_ACCOUNTS]: staffCount,
    };

    // Features that can have add-on limits
    const addOnFeatureKeys: string[] = [
      FEATURE_KEYS.DOCTOR_ACCOUNTS,
      FEATURE_KEYS.RECEPTIONIST_ACCOUNTS,
      FEATURE_KEYS.STAFF_ACCOUNTS,
    ];

    const overview = await Promise.all(
      limits.map(async (limit) => {
        // Use real-time count for account-based features, usage table for others
        const currentUsage =
          realTimeCountMap[limit.featureKey] ??
          usageMap.get(limit.featureKey) ??
          0;

        // Calculate add-on contribution for account-based features
        const isAddOnFeature = addOnFeatureKeys.includes(limit.featureKey);
        const addOnLimit = isAddOnFeature
          ? await this.getAccountAddOnLimit(clinicId, limit.featureKey)
          : 0;

        const baseLimit =
          limit.isUnlimited || !limit.enabled ? 0 : (limit.limitValue ?? 0);
        const totalLimit = baseLimit + addOnLimit;

        return {
          featureKey: limit.featureKey,
          description: limit.description,
          enabled: limit.enabled,
          baseLimit,
          addOnLimit,
          totalLimit,
          isUnlimited: limit.isUnlimited,
          currentUsage,
          remaining: limit.isUnlimited
            ? null
            : totalLimit > 0
              ? Math.max(0, totalLimit - currentUsage)
              : null,
        };
      })
    );

    const result = {
      plan: { planId: plan.planId, planSlug: plan.planSlug },
      limits: overview,
    };

    // Cache for 2 minutes (short TTL since counts can change)
    await redisClient.setex(cacheKey, 120, JSON.stringify(result));

    return result;
  }

  /**
   * Invalidate cached plan data for a clinic (call when subscription changes)
   */
  static async invalidateClinicCache(clinicId: string): Promise<void> {
    await redisClient.del(`clinic_plan:${clinicId}`);
    await redisClient.del(`clinic_limits_overview:${clinicId}`);
  }

  // ==================== Staff Enforcement on Plan Expiry/Downgrade ====================

  /**
   * Enforce staff limits by archiving (soft-blocking) excess staff members.
   * Called when a plan expires or is downgraded.
   *
   * Strategy:
   * - Keeps the most recently added staff (by ClinicAssign.createdAt)
   * - Archives (isArchive=true) the oldest excess staff
   * - Sets userStatus to 'Inactive' so they can't log in
   * - Does NOT delete any data — fully reversible if the clinic resubscribes
   *
   * Returns the list of affected users for notification purposes.
   */
  static async enforceStaffLimitsOnExpiry(clinicId: string): Promise<{
    doctorsDeactivated: {
      id: string;
      name: string | null;
      email: string | null;
    }[];
    staffDeactivated: {
      id: string;
      name: string | null;
      email: string | null;
      userType: string;
    }[];
    warnings: string[];
  }> {
    const doctorsDeactivated: {
      id: string;
      name: string | null;
      email: string | null;
    }[] = [];
    const staffDeactivated: {
      id: string;
      name: string | null;
      email: string | null;
      userType: string;
    }[] = [];
    const warnings: string[] = [];

    // --- Doctor enforcement ---
    const doctorCheck = await this.checkDoctorLimit(clinicId);

    if (!doctorCheck.allowed && doctorCheck.limit !== null) {
      const excess = doctorCheck.currentUsage - doctorCheck.limit;

      if (excess > 0) {
        // Get all doctors ordered by assignment date (oldest first — they get deactivated)
        const doctors = await database
          .select({
            userId: ClinicAssignModel.userId,
            name: UserModel.name,
            email: UserModel.email,
            createdAt: ClinicAssignModel.createdAt,
          })
          .from(ClinicAssignModel)
          .innerJoin(UserModel, eq(UserModel.id, ClinicAssignModel.userId))
          .where(
            and(
              eq(ClinicAssignModel.clinicId, clinicId),
              eq(UserModel.isArchive, false),
              or(
                eq(UserModel.userType, 'Doctor'),
                and(
                  eq(UserModel.userType, 'Admin'),
                  eq(UserModel.isAdminDoctorAccess, true)
                )
              )
            )
          )
          .orderBy(sql`${ClinicAssignModel.createdAt} ASC`);

        // Deactivate the oldest `excess` doctors
        const toDeactivate = doctors.slice(0, excess);

        for (const doc of toDeactivate) {
          await database
            .update(UserModel)
            .set({
              isArchive: true,
              userStatus: 'Inactive',
              updatedAt: new Date(),
            })
            .where(eq(UserModel.id, doc.userId));

          // Invalidate user auth cache so they're blocked immediately
          await redisClient.del(`user:${doc.userId}`);

          doctorsDeactivated.push({
            id: doc.userId,
            name: doc.name,
            email: doc.email,
          });
        }

        warnings.push(
          `${excess} doctor(s) have been deactivated due to plan limits. They can be reactivated after upgrading.`
        );
      }
    }

    // --- Staff enforcement ---
    const staffCheck = await this.checkStaffLimit(clinicId);

    if (!staffCheck.allowed && staffCheck.limit !== null) {
      const excess = staffCheck.currentUsage - staffCheck.limit;

      if (excess > 0) {
        // Get all staff ordered by assignment date (oldest first — they get deactivated)
        const staff = await database
          .select({
            userId: ClinicAssignModel.userId,
            name: UserModel.name,
            email: UserModel.email,
            userType: UserModel.userType,
            createdAt: ClinicAssignModel.createdAt,
          })
          .from(ClinicAssignModel)
          .innerJoin(UserModel, eq(UserModel.id, ClinicAssignModel.userId))
          .where(
            and(
              eq(ClinicAssignModel.clinicId, clinicId),
              eq(UserModel.isArchive, false),
              or(
                eq(UserModel.userType, 'Receptionist'),
                eq(UserModel.userType, 'Nurse'),
                eq(UserModel.userType, 'Pharmacist'),
                eq(UserModel.userType, 'Lab_Assistant'),
                eq(UserModel.userType, 'Radiologist')
              )
            )
          )
          .orderBy(sql`${ClinicAssignModel.createdAt} ASC`);

        // Deactivate the oldest `excess` staff
        const toDeactivate = staff.slice(0, excess);

        for (const member of toDeactivate) {
          await database
            .update(UserModel)
            .set({
              isArchive: true,
              userStatus: 'Inactive',
              updatedAt: new Date(),
            })
            .where(eq(UserModel.id, member.userId));

          // Invalidate user auth cache so they're blocked immediately
          await redisClient.del(`user:${member.userId}`);

          staffDeactivated.push({
            id: member.userId,
            name: member.name,
            email: member.email,
            userType: member.userType,
          });
        }

        warnings.push(
          `${excess} staff member(s) have been deactivated due to plan limits. They can be reactivated after upgrading.`
        );
      }
    }

    // Invalidate cache after changes
    if (doctorsDeactivated.length > 0 || staffDeactivated.length > 0) {
      await this.invalidateClinicCache(clinicId);
    }

    return { doctorsDeactivated, staffDeactivated, warnings };
  }

  /**
   * Reactivate previously deactivated (archived) staff when a clinic upgrades.
   * Reactivates up to the new plan's available slots.
   *
   * Returns the count of staff reactivated.
   */
  static async reactivateStaffOnUpgrade(clinicId: string): Promise<{
    doctorsReactivated: number;
    staffReactivated: number;
  }> {
    let doctorsReactivated = 0;
    let staffReactivated = 0;

    // Clear the enforcement flag so future expiry can re-trigger enforcement
    await redisClient.del(`staff_enforcement_done:${clinicId}`);

    // --- Doctors ---
    const doctorCheck = await this.checkDoctorLimit(clinicId);

    if (
      doctorCheck.allowed &&
      doctorCheck.remaining &&
      doctorCheck.remaining > 0
    ) {
      // Find archived doctors to reactivate
      const archivedDoctors = await database
        .select({ userId: ClinicAssignModel.userId })
        .from(ClinicAssignModel)
        .innerJoin(UserModel, eq(UserModel.id, ClinicAssignModel.userId))
        .where(
          and(
            eq(ClinicAssignModel.clinicId, clinicId),
            eq(UserModel.isArchive, true),
            eq(UserModel.userStatus, 'Inactive'),
            or(
              eq(UserModel.userType, 'Doctor'),
              and(
                eq(UserModel.userType, 'Admin'),
                eq(UserModel.isAdminDoctorAccess, true)
              )
            )
          )
        )
        .orderBy(sql`${ClinicAssignModel.createdAt} DESC`)
        .limit(doctorCheck.remaining);

      for (const doc of archivedDoctors) {
        await database
          .update(UserModel)
          .set({
            isArchive: false,
            userStatus: 'Active',
            updatedAt: new Date(),
          })
          .where(eq(UserModel.id, doc.userId));
        doctorsReactivated++;
      }
    }

    // --- Staff ---
    const staffCheck = await this.checkStaffLimit(clinicId);

    if (
      staffCheck.allowed &&
      staffCheck.remaining &&
      staffCheck.remaining > 0
    ) {
      // Find archived staff to reactivate
      const archivedStaff = await database
        .select({ userId: ClinicAssignModel.userId })
        .from(ClinicAssignModel)
        .innerJoin(UserModel, eq(UserModel.id, ClinicAssignModel.userId))
        .where(
          and(
            eq(ClinicAssignModel.clinicId, clinicId),
            eq(UserModel.isArchive, true),
            eq(UserModel.userStatus, 'Inactive'),
            or(
              eq(UserModel.userType, 'Receptionist'),
              eq(UserModel.userType, 'Nurse'),
              eq(UserModel.userType, 'Pharmacist'),
              eq(UserModel.userType, 'Lab_Assistant'),
              eq(UserModel.userType, 'Radiologist')
            )
          )
        )
        .orderBy(sql`${ClinicAssignModel.createdAt} DESC`)
        .limit(staffCheck.remaining);

      for (const member of archivedStaff) {
        await database
          .update(UserModel)
          .set({
            isArchive: false,
            userStatus: 'Active',
            updatedAt: new Date(),
          })
          .where(eq(UserModel.id, member.userId));
        staffReactivated++;
      }
    }

    if (doctorsReactivated > 0 || staffReactivated > 0) {
      await this.invalidateClinicCache(clinicId);
    }

    return { doctorsReactivated, staffReactivated };
  }
}
