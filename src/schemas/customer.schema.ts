import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(20).optional(),
  address: z.string().trim().max(500).optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  phone: z.string().trim().max(20).optional(),
  address: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const listCustomersQuerySchema = z.object({
  isActive: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((v) => (typeof v === 'boolean' ? v : v === 'true'))
    .optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(100),
});

export type CreateCustomerDto = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerDto = z.infer<typeof updateCustomerSchema>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
