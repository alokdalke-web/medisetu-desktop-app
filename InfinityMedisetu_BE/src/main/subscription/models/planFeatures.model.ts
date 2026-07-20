import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { SubscriptionPlanModel } from './subscription.model';

/**
 * Plan Features / Limits Model
 *
 * Unified table for both feature definitions (marketing/display) and numeric/boolean limits.
 * Replaces FeatureModel + PlanLimitsModel
 *
 * Feature Keys (used in code):
 * - whatsapp_messages_per_month  → value: 50 (free), 2000 (premium)
 * - doctor_accounts              → value: 1 (free), 2 (premium)
 * - receptionist_accounts        → value: 1 (free), 2 (premium)
 * - storage_months               → value: 3 (free), 12 (premium)
 * - payment_history_months       → value: 3 (free), null/unlimited (premium)
 * - lab_integration              → enabled: false (free), true (premium)
 * - pharmacy_integration         → enabled: false (free), true (premium)
 * - dashboard_full_access        → enabled: false (free), true (premium)
 * - reports_analytics            → enabled: false (free), true (premium)
 * - smart_prescriptions          → enabled: false (free), true (premium)
 * - priority_support             → enabled: false (free), true (premium)
 */
export const PlanFeaturesModel = pgTable(
  'plan_features',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    planId: uuid('plan_id')
      .notNull()
      .references(() => SubscriptionPlanModel.id, { onDelete: 'cascade' }),

    /** Unique feature key identifier */
    featureKey: varchar('feature_key', { length: 100 }).notNull(),

    /** Human-readable display name (optional, derived from featureKey if not set) */
    displayName: varchar('display_name', { length: 150 }),

    /** Human-readable description */
    description: varchar('description', { length: 255 }),

    /**
     * Feature type:
     * - 'numeric': has a limitValue (e.g., 100 messages/month)
     * - 'boolean': is enabled/disabled (e.g., lab_integration)
     * - 'marketing': display-only feature (e.g., "Smart Prescriptions")
     */
    type: varchar('type', { length: 20 }).notNull().default('numeric'),

    /** Numeric limit value (null means check `enabled` flag instead) */
    limitValue: integer('limit_value'),

    /** If true, this feature has no numeric cap (unlimited) */
    isUnlimited: boolean('is_unlimited').default(false).notNull(),

    /** For boolean features: is this feature enabled for this plan? */
    enabled: boolean('enabled').default(true).notNull(),

    /** For display ordering */
    sortOrder: integer('sort_order').default(0),

    /** Whether this is a marketing/highlighted feature */
    isMarketingFeature: boolean('is_marketing_feature').default(false),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => [
    uniqueIndex('plan_features_plan_key_unique').on(
      table.planId,
      table.featureKey
    ),
  ]
);

export type PlanFeature = typeof PlanFeaturesModel.$inferSelect;
export type NewPlanFeature = typeof PlanFeaturesModel.$inferInsert;
