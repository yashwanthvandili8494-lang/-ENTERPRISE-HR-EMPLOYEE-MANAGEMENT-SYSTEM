const { z } = require('zod');
const { ALL_ROLES } = require('../utils/constants');

const loginSchema = z.object({
  email: z.string().trim().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Valid email is required'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(ALL_ROLES),
  employee: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

const updateUserSchema = z.object({
  name: z.string().trim().min(2).optional(),
  role: z.enum(ALL_ROLES).optional(),
  isActive: z.boolean().optional(),
  employee: z.string().nullable().optional(),
});

module.exports = {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  createUserSchema,
  updateUserSchema,
};
