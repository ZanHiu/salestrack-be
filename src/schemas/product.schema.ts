import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(200),
  categoryName: z.string().trim().min(1).max(100),
  categoryOrder: z.number().int().min(1).max(99),
  unit: z.string().trim().max(20).optional(),
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  categoryName: z.string().trim().min(1).max(100).optional(),
  categoryOrder: z.number().int().min(1).max(99).optional(),
  unit: z.string().trim().max(20).optional(),
  isActive: z.boolean().optional(),
});

export const listProductsQuerySchema = z.object({
  categoryName: z.string().trim().max(100).optional(),
  isActive: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((v) => (typeof v === 'boolean' ? v : v === 'true'))
    .optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(100),
});

export type CreateProductDto = z.infer<typeof createProductSchema>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
