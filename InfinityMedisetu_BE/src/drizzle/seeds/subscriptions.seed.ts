import { database } from '../../configurations/dbConnection';
import { SubscriptionPlanModel } from '../../main/subscription/models/subscription.model';
import { PlanFeaturesModel } from '../../main/subscription/models/planFeatures.model';
import logger from '../../utils/logger';

interface PlanLimit {
  featureKey: string;
  limitValue: number | null;
  isUnlimited: boolean;
  enabled: boolean;
  description: string;
}

const plans = [
  {
    slug: 'Free',
    name: 'Free',
    description: 'Basic access for small clinics',
    price: 0 as any,
    currency: 'INR',
    features: [
      {
        name: 'Reports',
        description: 'Standard clinic reports',
      },
      {
        name: 'Appointments',
        description: 'Limited appointment scheduling',
      },
      {
        name: 'Patients',
        description: 'Manage limited patient records',
      },
    ],
    limits: [
      {
        featureKey: 'whatsapp_messages_per_month',
        limitValue: 0,
        isUnlimited: false,
        enabled: false,
        description: 'WhatsApp messages allowed per month',
      },
      {
        featureKey: 'doctor_accounts',
        limitValue: 2,
        isUnlimited: false,
        enabled: true,
        description: 'Maximum doctor accounts per clinic',
      },
      {
        featureKey: 'receptionist_accounts',
        limitValue: 1,
        isUnlimited: false,
        enabled: true,
        description: 'Maximum receptionist accounts per clinic',
      },
      {
        featureKey: 'storage_months',
        limitValue: 3,
        isUnlimited: false,
        enabled: true,
        description:
          'File storage retention in months (prescriptions, reports)',
      },
      {
        featureKey: 'payment_history_months',
        limitValue: 3,
        isUnlimited: false,
        enabled: true,
        description: 'Payment history access in months',
      },
      {
        featureKey: 'lab_integration',
        limitValue: null,
        isUnlimited: false,
        enabled: true,
        description: 'Lab integration module access',
      },
      {
        featureKey: 'pharmacy_integration',
        limitValue: null,
        isUnlimited: false,
        enabled: true,
        description: 'Pharmacy integration module access',
      },
      {
        featureKey: 'dashboard_full_access',
        limitValue: null,
        isUnlimited: false,
        enabled: false,
        description: 'Full dashboard analytics and insights',
      },
      {
        featureKey: 'reports_analytics',
        limitValue: null,
        isUnlimited: false,
        enabled: true,
        description: 'Reports & analytics (planned feature)',
      },
      {
        featureKey: 'smart_prescriptions',
        limitValue: null,
        isUnlimited: false,
        enabled: true,
        description: 'Smart prescriptions (planned feature)',
      },
      {
        featureKey: 'priority_support',
        limitValue: null,
        isUnlimited: false,
        enabled: false,
        description: 'Priority customer support',
      },
    ] as PlanLimit[],
  },
  {
    slug: 'pro-monthly',
    name: 'Pro',
    description: 'Advanced features for growing clinics',
    price: 999 as any,
    currency: 'INR',
    features: [
      {
        name: 'Pharmacy',
        description: 'Full pharmacy and stock management',
      },
      {
        name: 'Labs',
        description: 'Unlimited labs create and manage',
      },
      {
        name: 'Reports',
        description: 'Advanced reports and analytics',
      },
    ],
    limits: [
      {
        featureKey: 'whatsapp_messages_per_month',
        limitValue: 2000,
        isUnlimited: false,
        enabled: true,
        description: 'WhatsApp messages allowed per month',
      },
      {
        featureKey: 'doctor_accounts',
        limitValue: 2,
        isUnlimited: false,
        enabled: true,
        description: 'Maximum doctor accounts per clinic',
      },
      {
        featureKey: 'receptionist_accounts',
        limitValue: 2,
        isUnlimited: false,
        enabled: true,
        description: 'Maximum receptionist accounts per clinic',
      },
      {
        featureKey: 'storage_months',
        limitValue: 12,
        isUnlimited: false,
        enabled: true,
        description:
          'File storage retention in months (prescriptions, reports)',
      },
      {
        featureKey: 'payment_history_months',
        limitValue: null,
        isUnlimited: true,
        enabled: true,
        description: 'Payment history access in months',
      },
      {
        featureKey: 'lab_integration',
        limitValue: null,
        isUnlimited: false,
        enabled: true,
        description: 'Lab integration module access',
      },
      {
        featureKey: 'pharmacy_integration',
        limitValue: null,
        isUnlimited: false,
        enabled: true,
        description: 'Pharmacy integration module access',
      },
      {
        featureKey: 'dashboard_full_access',
        limitValue: null,
        isUnlimited: false,
        enabled: true,
        description: 'Full dashboard analytics and insights',
      },
      {
        featureKey: 'reports_analytics',
        limitValue: null,
        isUnlimited: false,
        enabled: false,
        description: 'Reports & analytics (planned feature)',
      },
      {
        featureKey: 'smart_prescriptions',
        limitValue: null,
        isUnlimited: false,
        enabled: false,
        description: 'Smart prescriptions (planned feature)',
      },
      {
        featureKey: 'priority_support',
        limitValue: null,
        isUnlimited: false,
        enabled: true,
        description: 'Priority customer support',
      },
    ] as PlanLimit[],
  },
];

export async function seedSubscriptions() {
  try {
    logger.info('Seeding subscription plans, features, and plan limits...');

    for (const planData of plans) {
      const { features, limits, ...plan } = planData;

      // Insert or update plan
      const [insertedPlan] = await database
        .insert(SubscriptionPlanModel)
        .values({
          slug: plan.slug,
          name: plan.name,
          description: plan.description,
          price: plan.price,
          currency: plan.currency,
        })
        .onConflictDoUpdate({
          target: [SubscriptionPlanModel.slug],
          set: {
            name: plan.name,
            description: plan.description,
            price: plan.price,
            currency: plan.currency,
            updatedAt: new Date(),
          },
        })
        .returning({ id: SubscriptionPlanModel.id });

      // Insert or update features for this plan
      for (const feature of features) {
        await database
          .insert(PlanFeaturesModel)
          .values({
            planId: insertedPlan.id,
            featureKey: feature.name.toLowerCase().replace(/\s+/g, '_'),
            displayName: feature.name,
            description: feature.description,
            type: 'marketing',
            isMarketingFeature: true,
          })
          .onConflictDoUpdate({
            target: [PlanFeaturesModel.planId, PlanFeaturesModel.featureKey],
            set: {
              displayName: feature.name,
              description: feature.description,
              updatedAt: new Date(),
            },
          });
      }

      // Insert or update plan limits
      for (const limit of limits) {
        await database
          .insert(PlanFeaturesModel)
          .values({
            planId: insertedPlan.id,
            featureKey: limit.featureKey,
            limitValue: limit.limitValue,
            isUnlimited: limit.isUnlimited,
            enabled: limit.enabled,
            description: limit.description,
          })
          .onConflictDoUpdate({
            target: [PlanFeaturesModel.planId, PlanFeaturesModel.featureKey],
            set: {
              limitValue: limit.limitValue,
              isUnlimited: limit.isUnlimited,
              enabled: limit.enabled,
              description: limit.description,
              updatedAt: new Date(),
            },
          });
      }
    }

    logger.info(
      'Subscription plans, features, and plan limits seeded successfully!'
    );
  } catch (error) {
    logger.error('Error seeding subscriptions:', error);
    throw error;
  }
}
