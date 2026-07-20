import { z } from "zod";

export const planFeatureSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Feature name is required"),
  description: z.string().min(1, "Feature description is required"),
  isDeleted: z.boolean().optional(),
});

export const createPlanSchema = z.object({
  slug: z.string().min(1, "Slug is required"),
  name: z.string().min(1, "Plan name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.coerce.number().min(0, "Price must be at least 0"),
  currency: z.string().min(1, "Currency is required"),
  features: z.array(planFeatureSchema).min(1, "At least one feature is required"),
});

export type CreatePlanDto = z.infer<typeof createPlanSchema>;
export type CreatePlanFormValues = z.input<typeof createPlanSchema>;
export type PlanFeatureDto = z.infer<typeof planFeatureSchema>;
