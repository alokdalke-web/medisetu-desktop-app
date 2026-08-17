import { z } from "zod";

export const MIN_PLAN_FEATURES = 1;
export const MAX_PLAN_FEATURES = 8;
export const MAX_PLAN_PRICE = 9999;
export const PLAN_NAME_MAX_WORDS = 30;
export const PLAN_NAME_MAX_WORD_LENGTH = 30;
export const PLAN_DESCRIPTION_MAX_WORDS = 50;
export const PLAN_DESCRIPTION_MAX_WORD_LENGTH = 50;
export const FEATURE_NAME_MAX_WORDS = 30;
export const FEATURE_NAME_MAX_WORD_LENGTH = 30;

const countWords = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;
const hasLongWord = (value: string, maxLength: number) =>
  value.trim().split(/\s+/).filter(Boolean).some((word) => word.length > maxLength);

export const planFeatureSchema = z
  .object({
    id: z.string().optional(),
    name: z.string(),
    description: z.string(),
    isDeleted: z.boolean().optional(),
  })
  .superRefine((feature, ctx) => {
    if (feature.isDeleted) return;

    if (!feature.name.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["name"],
        message: "Feature name is required",
      });
    }

    if (countWords(feature.name) > FEATURE_NAME_MAX_WORDS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["name"],
        message: `Feature name must be ${FEATURE_NAME_MAX_WORDS} words or less`,
      });
    }

    if (hasLongWord(feature.name, FEATURE_NAME_MAX_WORD_LENGTH)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["name"],
        message: `Each feature name word must be ${FEATURE_NAME_MAX_WORD_LENGTH} characters or less`,
      });
    }

    if (!feature.description.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["description"],
        message: "Feature description is required",
      });
    }
  });

export const createPlanSchema = z
  .object({
    slug: z.string().min(1, "Slug is required"),
    name: z.string().min(1, "Plan name is required"),
    description: z.string().min(1, "Description is required"),
    price: z.coerce
      .number()
      .min(0, "Price must be at least 0")
      .max(MAX_PLAN_PRICE, "Price must be 4 digits or less")
      .refine(Number.isInteger, "Price must be a whole number"),
    currency: z.string().min(1, "Currency is required"),
    features: z.array(planFeatureSchema),
  })
  .superRefine((data, ctx) => {
    const activeFeaturesCount = data.features.filter((feature) => !feature.isDeleted).length;

    if (countWords(data.name) > PLAN_NAME_MAX_WORDS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["name"],
        message: `Plan name must be ${PLAN_NAME_MAX_WORDS} words or less`,
      });
    }

    if (hasLongWord(data.name, PLAN_NAME_MAX_WORD_LENGTH)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["name"],
        message: `Each plan name word must be ${PLAN_NAME_MAX_WORD_LENGTH} characters or less`,
      });
    }

    if (countWords(data.description) > PLAN_DESCRIPTION_MAX_WORDS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["description"],
        message: `Description must be ${PLAN_DESCRIPTION_MAX_WORDS} words or less`,
      });
    }

    if (hasLongWord(data.description, PLAN_DESCRIPTION_MAX_WORD_LENGTH)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["description"],
        message: `Each description word must be ${PLAN_DESCRIPTION_MAX_WORD_LENGTH} characters or less`,
      });
    }

    if (activeFeaturesCount < MIN_PLAN_FEATURES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["features"],
        message: "At least one feature is required",
      });
    }

    if (activeFeaturesCount > MAX_PLAN_FEATURES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["features"],
        message: `Maximum ${MAX_PLAN_FEATURES} features are allowed`,
      });
    }
  });

export type CreatePlanDto = z.infer<typeof createPlanSchema>;
export type CreatePlanFormValues = z.input<typeof createPlanSchema>;
export type PlanFeatureDto = z.infer<typeof planFeatureSchema>;
