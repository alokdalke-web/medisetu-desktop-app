import { z } from "zod";

// ── Enums ──────────────────────────────────────────────────────────────────────

export const BannerTypeEnum = z.enum([
  "Referral",
  "MedicineSpotlight",
  "OperationalAlert",
  "FeatureAnnouncement",
  "PromotionalOffer",
  "SystemAlert",
]);

export const BannerPriorityEnum = z.enum(["P0", "P1", "P2", "P3"]);

export const BannerPlacementEnum = z.enum([
  "DASHBOARD_TOP",
  "DASHBOARD_SIDEBAR",
  "INSIGHTS_WIDGET",
  "APPOINTMENT_HEADER",
  "LOGIN_PAGE",
  "BILLING_PAGE",
]);

export const BannerStatusEnum = z.enum([
  "Active",
  "Paused",
  "Scheduled",
  "Expired",
  "Draft",
]);

export type BannerType = z.infer<typeof BannerTypeEnum>;
export type BannerPriority = z.infer<typeof BannerPriorityEnum>;
export type BannerPlacement = z.infer<typeof BannerPlacementEnum>;
export type BannerStatus = z.infer<typeof BannerStatusEnum>;

// ── Create / Edit Banner Schema ────────────────────────────────────────────────

export const bannerFormSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(255, "Max 255 characters"),

    // Optional fields — empty string treated as absent
    description: z
      .string()
      .max(2000, "Max 2000 characters")
      .optional()
      .or(z.literal("")),

    bannerType: BannerTypeEnum,
    priority: BannerPriorityEnum,
    placement: BannerPlacementEnum,

    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),

    ctaText: z.string().max(100, "Max 100 characters").optional().or(z.literal("")),
    ctaUrl: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine(
        (v) => !v || /^https?:\/\/.+/.test(v),
        "Must be a valid URL starting with http:// or https://",
      ),

    // Image fields (new in v2)
    imageUrl: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine(
        (v) => !v || /^https?:\/\/.+/.test(v),
        "Must be a valid image URL starting with http:// or https://",
      ),
    thumbnailUrl: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine(
        (v) => !v || /^https?:\/\/.+/.test(v),
        "Must be a valid image URL starting with http:// or https://",
      ),
    imageAlt: z.string().max(255, "Max 255 characters").optional().or(z.literal("")),

    // Targeting — empty array = all (backend treats null/absent as "all")
    targetRoles: z.array(z.string()).optional(),
    targetClinics: z.array(z.string()).optional(),
    targetSpecialties: z.array(z.string()).optional(),

    isSponsored: z.boolean().optional().default(false),
    isDismissible: z.boolean().optional().default(true),
    isActive: z.boolean().optional().default(true),
    isCritical: z.boolean().optional().default(false),

    displayOrder: z.number().int().min(0, "Must be 0 or greater").optional().default(0),
  })
  .refine(
    (data) =>
      !data.startDate ||
      !data.endDate ||
      new Date(data.startDate) <= new Date(data.endDate),
    {
      message: "End date must be the same as or after start date",
      path: ["endDate"],
    },
  );

export type BannerFormValues = z.infer<typeof bannerFormSchema>;

// ── Query / filter schema ──────────────────────────────────────────────────────

export const bannerQuerySchema = z.object({
  pageNumber: z.number().optional(),
  pageSize: z.number().optional(),
  search: z.string().optional(),
  bannerType: BannerTypeEnum.optional(),
  priority: BannerPriorityEnum.optional(),
  placement: BannerPlacementEnum.optional(),
  status: BannerStatusEnum.optional(),
  isActive: z.boolean().optional(),
});

export type BannerQueryDto = z.infer<typeof bannerQuerySchema>;
