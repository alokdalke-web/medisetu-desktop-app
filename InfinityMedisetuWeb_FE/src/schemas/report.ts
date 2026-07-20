import { z } from 'zod';
export const reportStatusSchema = z.enum(['Pendig', 'Approved', 'Rejected']);

export const createReportSchema = z.object({
  petientId: z.string().min(1, 'petientId is required'),
  reportType: z.string().min(1, 'reportType is required'),
  description: z.string().min(1, 'description is required').optional(),
  reportDocs: z.string().min(1, 'reportDocs is required'),
  reportStatus: reportStatusSchema.optional(),
});

export const updateReportSchema = z.object({
  reportType: z.string().min(1, 'reportType is required').optional(),
  description: z.string().min(1, 'description is required').optional(),
  reportDocs: z.string().min(1, 'reportDocs is required').optional(),
  reportStatus: reportStatusSchema.optional(),
});

export type createReportDto = z.infer<typeof createReportSchema>;
export type updateReportDto = z.infer<typeof updateReportSchema>;

export const getAllReportsQuerySchema = z.object({
  pageSize: z.string().min(1, 'pageSize is required').optional(),
  pageNumber: z.string().min(1, 'pageNumber is required').optional(),
  searchBy: z.string().optional(),
});
export type getAllReportsQueryDto = z.infer<typeof getAllReportsQuerySchema>;

export const getAllReportsParamSchema = z.object({
  petientId: z.string().min(1, 'pageSize is required').optional(),
});
export type getAllReportsQueryParamDto = z.infer<
  typeof getAllReportsParamSchema
>;
export const getReportsParamSchema = z.object({
  reportId: z.string().min(1, 'pageSize is required').optional(),
});
export type getReportsQueryParamDto = z.infer<typeof getReportsParamSchema>;
