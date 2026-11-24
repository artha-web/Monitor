/**
 * Check results routes
 * Retrieve monitoring check history and results
 */

import { Router, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { logger } from '../index.js';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import {
  monitorIdParamSchema,
  checkResultsQuerySchema,
  checkResultResponseSchema,
  type CheckResultsQuery,
  type CheckResultResponse
} from '@artha-monitor/shared';

const router = Router();

const normalizeCheckResultStatus = (status: string): CheckResultResponse['status'] =>
  status.toLowerCase() as CheckResultResponse['status'];

const denormalizeCheckResultStatus = (status: CheckResultsQuery['status']): string | undefined =>
  status?.toUpperCase();

// Helper to format check result
const formatCheckResult = (result: any): CheckResultResponse => ({
  id: result.id,
  monitorId: result.monitorId,
  status: normalizeCheckResultStatus(result.status),
  statusCode: result.statusCode,
  responseTime: result.responseTime,
  responseBody: result.responseBody,
  errorMessage: result.errorMessage,
  checkedAt: result.checkedAt.toISOString(),
});

// Get check results for a monitor
router.get('/monitor/:monitorId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const paramValidation = monitorIdParamSchema.safeParse(req.params);
  if (!paramValidation.success) {
    throw new ValidationError('Invalid monitor ID', { errors: paramValidation.error.errors });
  }

  const queryValidation = checkResultsQuerySchema.safeParse(req.query);
  if (!queryValidation.success) {
    throw new ValidationError('Invalid query parameters', { errors: queryValidation.error.errors });
  }

  const { monitorId } = paramValidation.data;
  const { page, limit, sortBy, sortOrder, status, from, to }: CheckResultsQuery = queryValidation.data;
  const userId = req.user!.id;

  // Verify monitor ownership
  const monitor = await prisma.monitor.findFirst({
    where: { id: monitorId, userId },
    select: { id: true },
  });

  if (!monitor) {
    throw new NotFoundError('Monitor');
  }

  // Build where clause
  const where: any = { monitorId };

  if (status) {
    where.status = denormalizeCheckResultStatus(status);
  }

  if (from || to) {
    where.checkedAt = {};
    if (from) where.checkedAt.gte = new Date(from);
    if (to) where.checkedAt.lte = new Date(to);
  }

  const [results, total] = await Promise.all([
    prisma.checkResult.findMany({
      where,
      orderBy: { [sortBy || 'checkedAt']: sortOrder || 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.checkResult.count({ where }),
  ]);

  res.json({
    success: true,
    data: results.map(formatCheckResult),
    meta: {
      timestamp: new Date().toISOString(),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
}));

// Get latest check result for a monitor
router.get('/monitor/:monitorId/latest', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const paramValidation = monitorIdParamSchema.safeParse(req.params);
  if (!paramValidation.success) {
    throw new ValidationError('Invalid monitor ID', { errors: paramValidation.error.errors });
  }

  const { monitorId } = paramValidation.data;
  const userId = req.user!.id;

  // Verify monitor ownership
  const monitor = await prisma.monitor.findFirst({
    where: { id: monitorId, userId },
    select: { id: true },
  });

  if (!monitor) {
    throw new NotFoundError('Monitor');
  }

  const result = await prisma.checkResult.findFirst({
    where: { monitorId },
    orderBy: { checkedAt: 'desc' },
  });

  if (!result) {
    return res.json({
      success: true,
      data: null,
      meta: { timestamp: new Date().toISOString() },
    });
  }

  res.json({
    success: true,
    data: formatCheckResult(result),
    meta: { timestamp: new Date().toISOString() },
  });
}));

// Get check results summary for dashboard
router.get('/summary', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  // Get user's monitors
  const monitors = await prisma.monitor.findMany({
    where: { userId, enabled: true },
    select: { id: true },
  });

  const monitorIds = monitors.map(m => m.id);

  if (monitorIds.length === 0) {
    return res.json({
      success: true,
      data: {
        totalChecks: 0,
        successfulChecks: 0,
        failedChecks: 0,
        successRate: 0,
        averageResponseTime: 0,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  }

  // Get stats for last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [totalChecks, successfulChecks, failedChecks, avgResponseTime] = await Promise.all([
    prisma.checkResult.count({
      where: { monitorId: { in: monitorIds }, checkedAt: { gte: since } },
    }),
    prisma.checkResult.count({
      where: { monitorId: { in: monitorIds }, checkedAt: { gte: since }, status: 'SUCCESS' },
    }),
    prisma.checkResult.count({
      where: { monitorId: { in: monitorIds }, checkedAt: { gte: since }, status: { in: ['FAILURE', 'TIMEOUT', 'ERROR'] } },
    }),
    prisma.checkResult.aggregate({
      where: { monitorId: { in: monitorIds }, checkedAt: { gte: since }, status: 'SUCCESS' },
      _avg: { responseTime: true },
    }),
  ]);

  const successRate = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 0;

  res.json({
    success: true,
    data: {
      totalChecks,
      successfulChecks,
      failedChecks,
      successRate: Math.round(successRate * 100) / 100,
      averageResponseTime: Math.round(avgResponseTime._avg.responseTime || 0),
    },
    meta: { timestamp: new Date().toISOString() },
  });
}));

export { router as checkResultsRouter };