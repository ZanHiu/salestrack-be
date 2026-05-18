import { z } from 'zod';

export const reportQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  categoryName: z.string().trim().max(100).optional(),
});

export const exportQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  type: z.enum(['by-product', 'by-customer']).default('by-customer'),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;
export type ExportQuery = z.infer<typeof exportQuerySchema>;
