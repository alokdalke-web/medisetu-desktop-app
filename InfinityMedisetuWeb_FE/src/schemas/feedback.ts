import { z } from "zod";

// -----------------------------
// Status enum
// -----------------------------
export const feedbackStatus = z.enum([
  "new",
  "reviewed",
  "resolved",
  "dismissed",
]);

// -----------------------------
// Tags (accepts simple strings or small objects)
// -----------------------------
export const tagStringSchema = z.string().min(1).max(50);

export const tagObjectSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});
export const tagsSchema = z
  .array(z.union([tagStringSchema, tagObjectSchema]))
  .max(10)
  .nullable()
  .optional();

// -----------------------------
// Core create (POST) schema
//    - appointmentId is optional/nullable (UUID expected by your model)
//    - rating required 1..5
// -----------------------------

export const createFeedbackSchema = z.object({
  appointmentId: z.uuid().nullable().optional(),
  doctorId: z.string().nullable().optional(),
  rating: z
    .number()
    .int({ message: "rating must be an integer" })
    .min(1, { message: "rating must be at least 1" })
    .max(5, { message: "rating must be at most 5" }),

  comments: z.string().trim().max(2000).nullable().optional(),

  attachments: z.array(z.string()).max(10).nullable().optional(),

  isAnonymous: z.boolean().optional(),

  // tags small array of short strings or objects
  tags: tagsSchema,
});

// -----------------------------
// Partial update schema (PATCH)
//    - allow partial updates but require at least one field
// -----------------------------

export const updateFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comments: z.string().trim().max(2000).optional(),
  attachments: z.array(z.string()).max(10).optional(),
  isAnonymous: z.boolean().optional(),
  status: feedbackStatus.optional(),
  tags: tagsSchema,
  response: z.string().trim().max(2000).optional(),
  responseAt: z.date().optional(),
});
export const respondFeedbackSchema = z.object({
  response: z.string().min(1).max(2000),
  status: feedbackStatus, // optionally change status when responding
});

export const feedbackQuerySchema = z.object({
  pageSize: z.string().min(1, "pageSize is required").optional(),
  pageNumber: z.string().min(1, "pageNumber is required").optional(),
  searchBy: z.string().min(1, "searchBy is required").optional(),
});
export const feedbackParamsSchema = z.object({
  feedBackId: z.string().min(1, "feedBackId is required"),
});

// -----------------------------
// Type exports (inferred)
// -----------------------------
export type CreateFeedbackDto = z.infer<typeof createFeedbackSchema>;
export type UpdateFeedbackDto = z.infer<typeof updateFeedbackSchema>;
export type RespondFeedbackDto = z.infer<typeof respondFeedbackSchema>;
export type FeedbackQueryDto = z.infer<typeof feedbackQuerySchema>;
export type FeedbackParamsDto = z.infer<typeof feedbackParamsSchema>;
