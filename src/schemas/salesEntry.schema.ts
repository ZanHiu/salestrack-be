import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const upsertEntrySchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  customerId: z.string().regex(objectIdRegex, 'customerId khong hop le'),
  productId: z.string().regex(objectIdRegex, 'productId khong hop le'),
  planAmount: z.number().min(0).max(1_000_000).optional(),
  actualAmount: z.number().min(0).max(1_000_000).optional(),
  unitPrice: z.number().min(0).max(1_000_000_000).optional(),
  quantity: z.number().min(0).max(1_000_000).optional(),
  note: z.string().trim().max(500).optional(),
});

export const updateEntrySchema = z.object({
  planAmount: z.number().min(0).max(1_000_000).optional(),
  actualAmount: z.number().min(0).max(1_000_000).optional(),
  unitPrice: z.number().min(0).max(1_000_000_000).optional(),
  quantity: z.number().min(0).max(1_000_000).optional(),
  note: z.string().trim().max(500).optional(),
});

export const listEntriesQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  customerId: z.string().regex(objectIdRegex).optional(),
  productId: z.string().regex(objectIdRegex).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  categoryName: z.string().trim().max(100).optional(),
});

export type UpsertEntryDto = z.infer<typeof upsertEntrySchema>;
export type UpdateEntryDto = z.infer<typeof updateEntrySchema>;
export type ListEntriesQuery = z.infer<typeof listEntriesQuerySchema>;
