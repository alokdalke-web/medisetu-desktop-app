// src/main/subscription/services/planLimits.seed.ts
import { eq } from 'drizzle-orm';
import { database } from '../../../configurations/dbConnection';
import { SubscriptionPlanModel } from '../models/subscription.model';
import { PlanFeaturesModel } from '../models/planFeatures.model';
import logger from '../../../utils/logger';

/**
 * Seed plan limits based on the pricing table in docs/limitations.md
 *
 * Run this once after creating the plan_limits table:
 *   npx tsx src/main/users/services/planLimits.seed.ts
 *
 * This is idempotent — safe to run multiple times (uses onConflictDoUpdate).
 */

interface LimitSeedData {
  featureKey: string;
  free: { limitValue: number | null; isUnlimited: boolean; enabled: boolean };
  premium: {
    limitValue: number | null;
    isUnlimited: boolean;
    enabled: boolean;
  };
  description: string;
}

const PLAN_LIMITS: LimitSeedData[] = [
  {
    featureKey: 'whatsapp_messages_per_month',
    free: { limitValue: 0, isUnlimited: false, enabled: true },
    premium: { limitValue: 2000, isUnlimited: false, enabled: true },
    description: 'WhatsApp messages allowed per month',
  },
  {
    featureKey: 'doctor_accounts',
    free: { limitValue: 1, isUnlimited: false, enabled: true },
    premium: { limitValue: 2, isUnlimited: false, enabled: true },
    description: 'Maximum doctor accounts per clinic',
  },
  {
    featureKey: 'receptionist_accounts',
    free: { limitValue: 1, isUnlimited: false, enabled: true },
    premium: { limitValue: 2, isUnlimited: false, enabled: true },
    description: 'Maximum receptionist accounts per clinic',
  },
  {
    featureKey: 'storage_months',
    free: { limitValue: 3, isUnlimited: false, enabled: true },
    premium: { limitValue: 12, isUnlimited: false, enabled: true },
    description: 'File storage retention in months (prescriptions, reports)',
  },
  {
    featureKey: 'payment_history_months',
    free: { limitValue: 3, isUnlimited: false, enabled: true },
    premium: { limitValue: null, isUnlimited: true, enabled: true },
    description: 'Payment history access in months',
  },
  {
    featureKey: 'lab_integration',
    free: { limitValue: null, isUnlimited: false, enabled: false },
    premium: { limitValue: null, isUnlimited: false, enabled: true },
    description: 'Lab integration module access',
  },
  {
    featureKey: 'pharmacy_integration',
    free: { limitValue: null, isUnlimited: false, enabled: false },
    premium: { limitValue: null, isUnlimited: false, enabled: true },
    description: 'Pharmacy integration module access',
  },
  {
    featureKey: 'dashboard_full_access',
    free: { limitValue: null, isUnlimited: false, enabled: false },
    premium: { limitValue: null, isUnlimited: false, enabled: true },
    description: 'Full dashboard analytics and insights',
  },
  {
    featureKey: 'reports_analytics',
    free: { limitValue: null, isUnlimited: false, enabled: false },
    premium: { limitValue: null, isUnlimited: false, enabled: false }, // Coming soon
    description: 'Reports & analytics (planned feature)',
  },
  {
    featureKey: 'smart_prescriptions',
    free: { limitValue: null, isUnlimited: false, enabled: false },
    premium: { limitValue: null, isUnlimited: false, enabled: false }, // Coming soon
    description: 'Smart prescriptions (planned feature)',
  },
  {
    featureKey: 'priority_support',
    free: { limitValue: null, isUnlimited: false, enabled: false },
    premium: { limitValue: null, isUnlimited: false, enabled: true },
    description: 'Priority customer support',
  },
];

export async function seedPlanLimits() {
  logger.info('🌱 Seeding plan limits...');

  // Get plan IDs
  const [freePlan] = await database
    .select()
    .from(SubscriptionPlanModel)
    .where(eq(SubscriptionPlanModel.slug, 'Free'))
    .limit(1);

  const [premiumPlan] = await database
    .select()
    .from(SubscriptionPlanModel)
    .where(eq(SubscriptionPlanModel.slug, 'pro-monthly'))
    .limit(1);

  if (!freePlan) {
    logger.error(
      '❌ Free plan not found. Please create subscription plans first.'
    );
    logger.info('   Insert into subscription_plans: slug="Free", name="Free"');
    return;
  }

  if (!premiumPlan) {
    logger.error(
      '❌ Pro plan not found. Please create subscription plans first.'
    );
    logger.info(
      '   Insert into subscription_plans: slug="pro-monthly", name="Pro"'
    );
    return;
  }

  for (const limit of PLAN_LIMITS) {
    // Seed free plan limit
    await database
      .insert(PlanFeaturesModel)
      .values({
        planId: freePlan.id,
        featureKey: limit.featureKey,
        limitValue: limit.free.limitValue,
        isUnlimited: limit.free.isUnlimited,
        enabled: limit.free.enabled,
        description: limit.description,
      })
      .onConflictDoUpdate({
        target: [PlanFeaturesModel.planId, PlanFeaturesModel.featureKey],
        set: {
          limitValue: limit.free.limitValue,
          isUnlimited: limit.free.isUnlimited,
          enabled: limit.free.enabled,
          description: limit.description,
          updatedAt: new Date(),
        },
      });

    // Seed premium plan limit
    await database
      .insert(PlanFeaturesModel)
      .values({
        planId: premiumPlan.id,
        featureKey: limit.featureKey,
        limitValue: limit.premium.limitValue,
        isUnlimited: limit.premium.isUnlimited,
        enabled: limit.premium.enabled,
        description: limit.description,
      })
      .onConflictDoUpdate({
        target: [PlanFeaturesModel.planId, PlanFeaturesModel.featureKey],
        set: {
          limitValue: limit.premium.limitValue,
          isUnlimited: limit.premium.isUnlimited,
          enabled: limit.premium.enabled,
          description: limit.description,
          updatedAt: new Date(),
        },
      });

    logger.info(`  ✅ ${limit.featureKey}`);
  }

  logger.info('🌱 Plan limits seeded successfully!');
}

// Allow running directly: npx tsx src/main/users/services/planLimits.seed.ts
if (require.main === module) {
  seedPlanLimits()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Seed failed:', err);
      process.exit(1);
    });
}
