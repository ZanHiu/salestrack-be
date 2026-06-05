import { z } from 'zod';

export const listAuditQuerySchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  resource: z
    .enum(['sales-entry', 'customer', 'product', 'category', 'user', 'auth'])
    .optional(),
  action: z
    .enum([
      'create',
      'update',
      'delete',
      'deactivate',
      'bulk_import',
      'login',
      'login_failed',
      'logout',
      'password_change',
      'profile_update',
    ])
    .optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>;
