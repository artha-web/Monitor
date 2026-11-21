/**
 * User routes
 * Account settings, profile management
 */

import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma.js';
import { logger } from '../index.js';
import { asyncHandler, ValidationError, NotFoundError, AuthenticationError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import {
  userResponseSchema,
  type UserResponse
} from '@artha-monitor/shared';
import { z } from 'zod';

const router = Router();

// Validation schemas
const updateProfileSchema = z.object({
  name: z.string().max(100).optional(),
  email: z.string().email().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
});

const updateNotificationSettingsSchema = z.object({
  emailEnabled: z.boolean().optional(),
  emailOnDown: z.boolean().optional(),
  emailOnUp: z.boolean().optional(),
  webhookUrl: z.string().url().optional().nullable(),
  webhookOnDown: z.boolean().optional(),
  webhookOnUp: z.boolean().optional(),
});

// Get current user profile
router.get('/profile', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError('Not authenticated');
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  const userResponse: UserResponse = {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() || null,
    role: user.role === 'ADMIN' ? 'admin' : 'user',
    quota: user.quota as UserResponse['quota'],
  };

  res.json({
    success: true,
    data: userResponse,
    meta: { timestamp: new Date().toISOString() },
  });
}));

// Update profile
router.patch('/profile', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError('Not authenticated');
  }

  const validation = updateProfileSchema.safeParse(req.body);
  if (!validation.success) {
    throw new ValidationError('Invalid profile data', { errors: validation.error.errors });
  }

  const { name, email } = validation.data;
  const userId = req.user.id;

  // Check if email is already taken by another user
  if (email) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        NOT: { id: userId },
      },
    });

    if (existingUser) {
      throw new ValidationError('Email is already in use');
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name !== undefined && { name: name.trim() || null }),
      ...(email !== undefined && { email: email.toLowerCase() }),
    },
  });

  const userResponse: UserResponse = {
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    emailVerified: updatedUser.emailVerified,
    createdAt: updatedUser.createdAt.toISOString(),
    updatedAt: updatedUser.updatedAt.toISOString(),
    lastLoginAt: updatedUser.lastLoginAt?.toISOString() || null,
    role: updatedUser.role === 'ADMIN' ? 'admin' : 'user',
    quota: updatedUser.quota as UserResponse['quota'],
  };

  logger.info({ userId }, 'Profile updated');

  res.json({
    success: true,
    data: userResponse,
    meta: { timestamp: new Date().toISOString() },
  });
}));

// Change password
router.post('/change-password', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError('Not authenticated');
  }

  const validation = changePasswordSchema.safeParse(req.body);
  if (!validation.success) {
    throw new ValidationError('Invalid password data', { errors: validation.error.errors });
  }

  const { currentPassword, newPassword } = validation.data;
  const userId = req.user.id;

  // Get user with password hash
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValidPassword) {
    throw new AuthenticationError('Current password is incorrect');
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, 12);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // Invalidate all sessions (force re-login)
  await prisma.session.deleteMany({
    where: { userId },
  });

  logger.info({ userId }, 'Password changed');

  res.json({
    success: true,
    data: { message: 'Password changed successfully. Please log in again.' },
    meta: { timestamp: new Date().toISOString() },
  });
}));

// Delete account
router.delete('/account', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError('Not authenticated');
  }

  const validation = z.object({
    password: z.string().min(1, 'Password is required for confirmation'),
    confirm: z.literal('DELETE', { errorMap: () => ({ message: 'Type DELETE to confirm' }) }),
  }).safeParse(req.body);

  if (!validation.success) {
    throw new ValidationError('Invalid confirmation', { errors: validation.error.errors });
  }

  const { password } = validation.data;
  const userId = req.user.id;

  // Verify password
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    throw new AuthenticationError('Password is incorrect');
  }

  // Delete user (cascades to monitors, sessions, etc.)
  await prisma.user.delete({ where: { id: userId } });

  logger.info({ userId }, 'Account deleted');

  res.json({
    success: true,
    data: { message: 'Account deleted successfully' },
    meta: { timestamp: new Date().toISOString() },
  });
}));

// Get account quota and usage
router.get('/quota', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new AuthenticationError('Not authenticated');
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      quota: true,
      _count: { select: { monitors: true } },
    },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  const quota = user.quota as any;
  const monitorCount = user._count.monitors;

  res.json({
    success: true,
    data: {
      maxMonitors: quota?.maxMonitors || 50,
      usedMonitors: monitorCount,
      remainingMonitors: Math.max(0, (quota?.maxMonitors || 50) - monitorCount),
      maxChecksPerMonth: quota?.maxChecksPerMonth || 100000,
      minInterval: quota?.minInterval || '1m',
      webhooksEnabled: quota?.webhooksEnabled || false,
      apiAccess: quota?.apiAccess || true,
    },
    meta: { timestamp: new Date().toISOString() },
  });
}));

export { router as usersRouter };