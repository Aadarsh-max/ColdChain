import { z } from 'zod';
import { ROLES } from '../config/roles.js';

export const emailSchema = z.string().trim().toLowerCase().email().max(120);

export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(72, 'Password must be at most 72 characters');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(200)
});

export const signupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  email: emailSchema,
  password: passwordSchema
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword: passwordSchema
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from the current one',
    path: ['newPassword']
  });

export const createUserSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1).max(80),
  role: z.enum(ROLES).default('viewer'),
  password: passwordSchema
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    role: z.enum(ROLES),
    active: z.boolean(),
    approval: z.enum(['approved', 'rejected'])
  })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

export const resetPasswordSchema = z.object({
  password: passwordSchema
});

export const userParamsSchema = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid userId')
});