import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6).max(100),
  newPassword: z.string().min(6).max(100),
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
