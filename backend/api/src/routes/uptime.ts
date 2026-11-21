/**
 * Uptime statistics routes
 * Calculate and return uptime percentages and downtime events
 */

import { Router, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { logger } from '../index.js';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import {
  monitorIdParamSchema,
  uptimeStatsQuerySchema,
  uptimeStatsSchema,
  downtimeEventSchema,
  type UptimeStatsQuery,
  type UptimeStatsResponse,
  type DowntimeEventResponse
} from '@artha-monitor/shared';

const router = Router();

type UptimePeriod = '24h' | '7d' | '30d' | '90d' | '365d';

const PERIOD_HOURS: Record<UptimePeriod, number> = {
  '24h': 24,
  '7d': 168,
  '30d': 720,
  '90d': 2160,
  '365d': 8760,
};

// Get uptime statistics for a monitor
router.get('/monitor/:monitorId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const paramValidation = monitorIdParamSchema.safeParse(req.params);
  if (!paramValidation.success) {
    throw new ValidationError('Invalid monitor ID', { errors: paramValidation.error.errors });
  }

  const queryValidation = uptimeStatsQuerySchema.safeParse(req.query);
  if (!queryValidation.success) {
    throw new ValidationError('Invalid query parameters', { errors: queryValidation.error.errors });
  }

  const monitorId = (paramValidation.data.monitorId || paramValidation.data.id)!;
  const { period }: UptimeStatsQuery = queryValidation.data;
  const userId = req.user!.id;

  // Verify monitor ownership
  const monitor = await prisma.monitor.findFirst({
    where: { id: monitorId, userId },
    select: { id: true, createdAt: true },
  });

  if (!monitor) {
    throw new NotFoundError('Monitor');
  }

  const hours = PERIOD_HOURS[period];
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const effectiveSince = monitor.createdAt > since ? monitor.createdAt : since;

  // Get check results in period
  const results = await prisma.checkResult.findMany({
    where: {
      monitorId,
      checkedAt: { gte: effectiveSince },
    },
    orderBy: { checkedAt: 'asc' },
    select: {
      id: true,
      status: true,
      statusCode: true,
      responseTime: true,
      checkedAt: true,
    },
  });

  // Get downtime events in period
  const downtimeEvents = await prisma.downtimeEvent.findMany({
    where: {
      monitorId,
      startedAt: { gte: effectiveSince },
    },
    orderBy: { startedAt: 'asc' },
  });

  // Calculate statistics
  const totalChecks = results.length;
  const successfulChecks = results.filter(r => r.status === 'SUCCESS').length;
  const failedChecks = totalChecks - successfulChecks;
  const uptimePercentage = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 100;

  const successfulResults = results.filter(r => r.status === 'SUCCESS');
  let totalResponseTime = 0;
  let minResponseTime = 0;
  let maxResponseTime = 0;

  if (successfulResults.length > 0) {
    minResponseTime = successfulResults[0].responseTime;
    maxResponseTime = successfulResults[0].responseTime;

    for (let i = 0; i < successfulResults.length; i++) {
      const rt = successfulResults[i].responseTime;
      totalResponseTime += rt;
      if (rt < minResponseTime) minResponseTime = rt;
      if (rt > maxResponseTime) maxResponseTime = rt;
    }
  }

  const averageResponseTime =
    successfulResults.length > 0 ? Math.round(totalResponseTime / successfulResults.length) : 0;

  // Format downtime events
  const formattedDowntimeEvents: DowntimeEventResponse[] = downtimeEvents.map(event => ({
    id: event.id,
    monitorId: event.monitorId,
    startedAt: event.startedAt.toISOString(),
    endedAt: event.endedAt?.toISOString() || null,
    duration: event.duration || null,
    reason: event.reason || null,
  }));

  const response: UptimeStatsResponse = {
    monitorId,
    period,
    uptimePercentage: Math.round(uptimePercentage * 100) / 100,
    totalChecks,
    successfulChecks,
    failedChecks,
    averageResponseTime: Math.round(averageResponseTime),
    minResponseTime,
    maxResponseTime,
    downtimeEvents: formattedDowntimeEvents,
  }

  // Validate response
  const validation = uptimeStatsSchema.safeParse(response);
  if (!validation.success) {
    logger.warn({ validationErrors: validation.error.errors }, 'Uptime stats response validation failed');
  }

  res.json({
    success: true,
    data: response,
    meta: { timestamp: new Date().toISOString() },
  });
}));

// Get uptime summary for all user's monitors
router.get('/summary', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const queryValidation = uptimeStatsQuerySchema.safeParse(req.query);
  if (!queryValidation.success) {
    throw new ValidationError('Invalid query parameters', { errors: queryValidation.error.errors });
  }

  const { period }: UptimeStatsQuery = queryValidation.data;
  const userId = req.user!.id;

  const hours = PERIOD_HOURS[period];
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  // Get all enabled monitors for user
  const monitors = await prisma.monitor.findMany({
    where: { userId, enabled: true },
    select: { id: true, name: true, url: true, currentStatus: true, createdAt: true },
  });

  if (monitors.length === 0) {
    return res.json({
      success: true,
      data: [],
      meta: { timestamp: new Date().toISOString() },
    });
  }

  const monitorIds = monitors.map(m => m.id);

  // Get check results for all monitors
  const results = await prisma.checkResult.findMany({
    where: {
      monitorId: { in: monitorIds },
      checkedAt: { gte: since },
    },
    select: {
      monitorId: true,
      status: true,
      responseTime: true,
      checkedAt: true,
    },
  });

  // Group results by monitor
  const resultsByMonitor = new Map<string, typeof results>();
  for (const result of results) {
    if (!resultsByMonitor.has(result.monitorId)) {
      resultsByMonitor.set(result.monitorId, []);
    }
    resultsByMonitor.get(result.monitorId)!.push(result);
  }

  // Calculate stats for each monitor
  const summary = monitors.map(monitor => {
    const monitorResults = resultsByMonitor.get(monitor.id) || [];
    const totalChecks = monitorResults.length;
    const successfulChecks = monitorResults.filter(r => r.status === 'SUCCESS').length;
    const uptimePercentage = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 100;

    const successfulResults = monitorResults.filter(r => r.status === 'SUCCESS');
    const responseTimes = successfulResults.map(r => r.responseTime);
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    return {
      monitorId: monitor.id,
      name: monitor.name,
      url: monitor.url,
      currentStatus: monitor.currentStatus,
      uptimePercentage: Math.round(uptimePercentage * 100) / 100,
      totalChecks,
      successfulChecks,
      failedChecks: totalChecks - successfulChecks,
      averageResponseTime: Math.round(averageResponseTime),
    };
  });

  res.json({
    success: true,
    data: summary,
    meta: { timestamp: new Date().toISOString() },
  });
}));

// Get downtime events for a monitor
router.get('/monitor/:monitorId/downtime', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const paramValidation = monitorIdParamSchema.safeParse(req.params);
  if (!paramValidation.success) {
    throw new ValidationError('Invalid monitor ID', { errors: paramValidation.error.errors });
  }

  const monitorId = (paramValidation.data.monitorId || paramValidation.data.id)!;
  const userId = req.user!.id;

  // Verify monitor ownership
  const monitor = await prisma.monitor.findFirst({
    where: { id: monitorId, userId },
    select: { id: true },
  });

  if (!monitor) {
    throw new NotFoundError('Monitor');
  }

  const events = await prisma.downtimeEvent.findMany({
    where: { monitorId },
    orderBy: { startedAt: 'desc' },
    take: 100,
  });

  const formattedEvents: DowntimeEventResponse[] = events.map(event => ({
    id: event.id,
    monitorId: event.monitorId,
    startedAt: event.startedAt.toISOString(),
    endedAt: event.endedAt?.toISOString() || null,
    duration: event.duration || null,
    reason: event.reason || null,
  }));

  res.json({
    success: true,
    data: formattedEvents,
    meta: { timestamp: new Date().toISOString() },
  });
}));

export { router as uptimeRouter };