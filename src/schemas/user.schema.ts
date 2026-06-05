import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().trim().toLowerCase().min(3).max(50),
  password: z.string().min(6).max(100),
  fullName: z.string().trim().min(1).max(100),
  role: z.enum(['admin', 'staff']).default('staff'),
});

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(1).max(100).optional(),
  role: z.enum(['admin', 'staff']).optional(),
  isActive: z.boolean().optional(),
  newPassword: z.string().min(6).max(100).optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
