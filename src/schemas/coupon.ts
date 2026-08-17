import { z } from "zod";

/**
 * Zod schema for coupon form validation.
 * Handles conditional logic for discountType + appliesTo fields.
 */
export const couponSchema = z
  .object({
    code: z
      .string()
      .min(3, "Code must be at least 3 characters")
      .max(50, "Code must be at most 50 characters")
      .transform((val) => val.toUpperCase())
      .pipe(
        z.string().regex(
          /^[A-Z0-9_-]+$/,
          "Only uppercase letters, numbers, hyphens, and underscores allowed"
        )
      ),
    description: z.string().optional().default(""),
    discountType: z.enum(["percentage", "fixed", "trial"]),
    discountValue: z
      .number({ error: "Discount value is required" })
      .min(0, "Discount value must be positive"),
    maxDiscountAmount: z.number().nullable().optional(),
    trialDays: z.number().nullable().optional(),
    appliesTo: z.enum([
      "all",
      "plans",
      "addons",
      "specific_plans",
      "specific_addons",
    ]),
    applicablePlanIds: z.array(z.number()).optional().default([]),
    applicableAddOnIds: z.array(z.number()).optional().default([]),
    maxUses: z.number().nullable().optional(),
    maxUsesPerClinic: z.number().min(1).optional().default(1),
    minOrderValue: z.number().nullable().optional(),
    firstTimeOnly: z.boolean().optional().default(false),
    startsAt: z.string().min(1, "Start date is required"),
    expiresAt: z.string().min(1, "Expiry date is required"),
  })
  .superRefine((data, ctx) => {
    // Percentage discount cannot exceed 100
    if (data.discountType === "percentage" && data.discountValue > 100) {
      ctx.addIssue({
        code: "custom",
        path: ["discountValue"],
        message: "Percentage cannot exceed 100",
      });
    }

    // Trial type requires trialDays
    if (
      data.discountType === "trial" &&
      (!data.trialDays || data.trialDays < 1)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["trialDays"],
        message: "Trial days is required for trial coupons",
      });
    }

    // specific_plans requires applicablePlanIds
    if (
      data.appliesTo === "specific_plans" &&
      (!data.applicablePlanIds || data.applicablePlanIds.length === 0)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["applicablePlanIds"],
        message: "Select at least one plan",
      });
    }

    // specific_addons requires applicableAddOnIds
    if (
      data.appliesTo === "specific_addons" &&
      (!data.applicableAddOnIds || data.applicableAddOnIds.length === 0)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["applicableAddOnIds"],
        message: "Select at least one add-on",
      });
    }

    // expiresAt must be after startsAt
    if (data.startsAt && data.expiresAt) {
      if (new Date(data.expiresAt) <= new Date(data.startsAt)) {
        ctx.addIssue({
          code: "custom",
          path: ["expiresAt"],
          message: "Expiry date must be after start date",
        });
      }
    }
  });

export type CouponFormValues = z.infer<typeof couponSchema>;
