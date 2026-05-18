import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(100),
});

export type Pagination = z.infer<typeof paginationSchema>;

export function getSkipLimit(p: Pagination): { skip: number; limit: number } {
  return { skip: (p.page - 1) * p.pageSize, limit: p.pageSize };
}
