/**
 * Monitor routes
 * CRUD operations for monitors
 */

import { Router, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { logger } from '../index.js';
import { asyncHandler, ValidationError, NotFoundError, AuthorizationError } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import {
  createMonitorSchema,
  updateMonitorSchema,
  monitorIdParamSchema,
  paginationQuerySchema,
  monitorResponseSchema,
  type CreateMonitorInput,
  type UpdateMonitorInput,
  type MonitorResponse,
  type PaginationQuery
} from '@artha-monitor/shared';
import { intervalToMs, calculateNextCheckAt } from '../utils/intervals.js';

const router = Router();

// Helper to convert Prisma monitor to response format
const formatMonitor = (monitor: any): MonitorResponse => {
  let uptimePercentage = 100;
  if (Array.isArray(monitor.checkResults) && monitor.checkResults.length > 0) {
    const successCount = monitor.checkResults.filter((c: any) => c.status === 'SUCCESS').length;
    uptimePercentage = Math.round((successCount / monitor.checkResults.length) * 10000) / 100;
  } else if (typeof monitor.uptimePercentage === 'number') {
    uptimePercentage = monitor.uptimePercentage;
  }

  return {
    id: monitor.id,
    userId: monitor.userId,
    name: monitor.name,
    url: monitor.url,
    method: monitor.method,
    interval: monitor.interval,
    timeout: monitor.timeout,
    expectedStatusCodes: monitor.expectedStatusCodes,
    expectedResponseText: monitor.expectedResponseText,
    headers: monitor.headers,
    body: monitor.body,
    enabled: monitor.enabled,
    notificationSettings: monitor.notificationSettings,
    activeWindowStart: monitor.activeWindowStart || null,
    activeWindowEnd: monitor.activeWindowEnd || null,
    activeWindowTimezone: monitor.activeWindowTimezone || null,
    createdAt: monitor.createdAt.toISOString(),
    updatedAt: monitor.updatedAt.toISOString(),
    lastCheckAt: monitor.lastCheckAt?.toISOString() || null,
    nextCheckAt: monitor.nextCheckAt?.toISOString() || null,
    currentStatus: !monitor.enabled ? 'paused' : monitor.currentStatus,
    uptimePercentage,
  };
};

// Get all monitors for current user
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const validation = paginationQuerySchema.safeParse(req.query);
  if (!validation.success) {
    throw new ValidationError('Invalid query parameters', { errors: validation.error.errors });
  }

  const { page, limit, sortBy, sortOrder }: PaginationQuery = validation.data;
  const userId = req.user!.id;

  // Check quota
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { quota: true, _count: { select: { monitors: true } } },
  });

  const quota = user?.quota as any;
  const currentCount = user?._count.monitors || 0;

  const where = { userId };
  const [monitors, total] = await Promise.all([
    prisma.monitor.findMany({
      where,
      orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        checkResults: {
          take: 50,
          orderBy: { checkedAt: 'desc' },
          select: { status: true },
        },
      },
    }),
    prisma.monitor.count({ where }),
  ]);

  res.json({
    success: true,
    data: monitors.map(formatMonitor),
    meta: {
      timestamp: new Date().toISOString(),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      quota: {
        used: currentCount,
        max: quota?.maxMonitors || 50,
      },
    },
  });
}));

// Get single monitor
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const paramValidation = monitorIdParamSchema.safeParse(req.params);
  if (!paramValidation.success) {
    throw new ValidationError('Invalid monitor ID', { errors: paramValidation.error.errors });
  }

  const { id } = paramValidation.data;
  const userId = req.user!.id;

  const monitor = await prisma.monitor.findFirst({
    where: { id, userId },
    include: {
      checkResults: {
        take: 50,
        orderBy: { checkedAt: 'desc' },
        select: { status: true },
      },
    },
  });

  if (!monitor) {
    throw new NotFoundError('Monitor');
  }

  res.json({
    success: true,
    data: formatMonitor(monitor),
    meta: { timestamp: new Date().toISOString() },
  });
}));

// Create new monitor
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const validation = createMonitorSchema.safeParse(req.body);
  if (!validation.success) {
    throw new ValidationError('Invalid monitor data', { errors: validation.error.errors });
  }

  const userId = req.user!.id;
  const data: CreateMonitorInput = validation.data;

  // Check quota
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { quota: true, _count: { select: { monitors: true } } },
  });

  const quota = user?.quota as any;
  const currentCount = user?._count.monitors || 0;

  if (currentCount >= (quota?.maxMonitors || 50)) {
    throw new ValidationError(`Monitor limit reached. Maximum ${quota?.maxMonitors || 50} monitors allowed.`);
  }

  // Check minimum interval
  const minIntervalMs = intervalToMs(quota?.minInterval || '1m');
  const requestedIntervalMs = intervalToMs(data.interval);
  if (requestedIntervalMs < minIntervalMs) {
    throw new ValidationError(`Minimum interval allowed is ${quota?.minInterval || '1m'}`);
  }

  // Calculate next check time
  const nextCheckAt = calculateNextCheckAt({
    interval: data.interval,
    activeWindowStart: data.activeWindowStart,
    activeWindowEnd: data.activeWindowEnd,
    timezone: data.activeWindowTimezone,
  });

  const monitor = await prisma.monitor.create({
    data: {
      userId,
      name: data.name,
      url: data.url,
      method: data.method || 'GET',
      interval: data.interval,
      timeout: data.timeout || 10000,
      expectedStatusCodes: data.expectedStatusCodes || [200],
      expectedResponseText: data.expectedResponseText || null,
      headers: (data.headers as any) ?? undefined,
      body: data.body || null,
      enabled: true,
      notificationSettings: data.notificationSettings || {},
      activeWindowStart: data.activeWindowStart ?? null,
      activeWindowEnd: data.activeWindowEnd ?? null,
      activeWindowTimezone: data.activeWindowTimezone ?? 'UTC',
      nextCheckAt,
    },
  });

  // Create initial worker job
  await prisma.workerJob.create({
    data: {
      monitorId: monitor.id,
      scheduledAt: nextCheckAt,
    },
  });

  logger.info({ monitorId: monitor.id, userId }, 'Monitor created');

  res.status(201).json({
    success: true,
    data: formatMonitor(monitor),
    meta: { timestamp: new Date().toISOString() },
  });
}));

// Update monitor
router.patch('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const paramValidation = monitorIdParamSchema.safeParse(req.params);
  if (!paramValidation.success) {
    throw new ValidationError('Invalid monitor ID', { errors: paramValidation.error.errors });
  }

  const bodyValidation = updateMonitorSchema.safeParse(req.body);
  if (!bodyValidation.success) {
    throw new ValidationError('Invalid monitor data', { errors: bodyValidation.error.errors });
  }

  const { id } = paramValidation.data;
  const userId = req.user!.id;
  const data: UpdateMonitorInput = bodyValidation.data;

  const monitor = await prisma.monitor.findFirst({
    where: { id, userId },
    include: {
      checkResults: {
        take: 50,
        orderBy: { checkedAt: 'desc' },
        select: { status: true },
      },
    },
  });

  if (!monitor) {
    throw new NotFoundError('Monitor');
  }

  // Check interval quota if changing interval
  if (data.interval && data.interval !== monitor.interval) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { quota: true },
    });
    const quota = user?.quota as any;
    const minIntervalMs = intervalToMs(quota?.minInterval || '1m');
    const requestedIntervalMs = intervalToMs(data.interval);
    if (requestedIntervalMs < minIntervalMs) {
      throw new ValidationError(`Minimum interval allowed is ${quota?.minInterval || '1m'}`);
    }
  }

  // Calculate next check time if interval or active window changed
  const intervalChanged = data.interval && data.interval !== monitor.interval;
  const windowChanged =
    data.activeWindowStart !== undefined ||
    data.activeWindowEnd !== undefined ||
    data.activeWindowTimezone !== undefined;

  let nextCheckAt = monitor.nextCheckAt;
  if (data.enabled === false) {
    nextCheckAt = null;
  } else if (intervalChanged || windowChanged || (data.enabled === true && !monitor.enabled)) {
    nextCheckAt = calculateNextCheckAt({
      interval: data.interval || monitor.interval,
      activeWindowStart: data.activeWindowStart !== undefined ? data.activeWindowStart : monitor.activeWindowStart,
      activeWindowEnd: data.activeWindowEnd !== undefined ? data.activeWindowEnd : monitor.activeWindowEnd,
      timezone: data.activeWindowTimezone !== undefined ? data.activeWindowTimezone : monitor.activeWindowTimezone,
    });
  }

  const updatedMonitor = await prisma.monitor.update({
    where: { id },
    data: {
      ...(data as any),
      nextCheckAt,
    },
  });

  // Update worker job if interval or enabled changed
  if (data.interval || data.enabled !== undefined) {
    await prisma.workerJob.deleteMany({
      where: { monitorId: id, status: 'PENDING' },
    });

    if (updatedMonitor.enabled && nextCheckAt) {
      await prisma.workerJob.create({
        data: {
          monitorId: id,
          scheduledAt: nextCheckAt,
        },
      });
    }
  }

  logger.info({ monitorId: id, userId }, 'Monitor updated');

  res.json({
    success: true,
    data: formatMonitor(updatedMonitor),
    meta: { timestamp: new Date().toISOString() },
  });
}));

// Delete monitor
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const paramValidation = monitorIdParamSchema.safeParse(req.params);
  if (!paramValidation.success) {
    throw new ValidationError('Invalid monitor ID', { errors: paramValidation.error.errors });
  }

  const { id } = paramValidation.data;
  const userId = req.user!.id;

  const monitor = await prisma.monitor.findFirst({
    where: { id, userId },
    include: {
      checkResults: {
        take: 50,
        orderBy: { checkedAt: 'desc' },
        select: { status: true },
      },
    },
  });

  if (!monitor) {
    throw new NotFoundError('Monitor');
  }

  // Delete associated worker jobs
  await prisma.workerJob.deleteMany({
    where: { monitorId: id },
  });

  // Delete monitor (cascades to checkResults and downtimeEvents)
  await prisma.monitor.delete({ where: { id } });

  logger.info({ monitorId: id, userId }, 'Monitor deleted');

  res.json({
    success: true,
    data: { message: 'Monitor deleted successfully' },
    meta: { timestamp: new Date().toISOString() },
  });
}));

// Toggle monitor enabled/disabled
router.post('/:id/toggle', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const paramValidation = monitorIdParamSchema.safeParse(req.params);
  if (!paramValidation.success) {
    throw new ValidationError('Invalid monitor ID', { errors: paramValidation.error.errors });
  }

  const { id } = paramValidation.data;
  const userId = req.user!.id;

  const monitor = await prisma.monitor.findFirst({
    where: { id, userId },
    include: {
      checkResults: {
        take: 50,
        orderBy: { checkedAt: 'desc' },
        select: { status: true },
      },
    },
  });

  if (!monitor) {
    throw new NotFoundError('Monitor');
  }

  const newEnabled = !monitor.enabled;
  const nextCheckAt = newEnabled
    ? new Date(Date.now() + intervalToMs(monitor.interval as any))
    : null;

  const now = new Date();

  // If pausing the monitor, gracefully close any active downtime events
  if (!newEnabled) {
    const activeDowntimes = await prisma.downtimeEvent.findMany({
      where: { monitorId: id, endedAt: null },
    });

    for (const dt of activeDowntimes) {
      const duration = Math.max(0, Math.floor((now.getTime() - dt.startedAt.getTime()) / 1000));
      await prisma.downtimeEvent.update({
        where: { id: dt.id },
        data: {
          endedAt: now,
          duration,
        },
      });
    }
  }

  const updatedMonitor = await prisma.monitor.update({
    where: { id },
    data: {
      enabled: newEnabled,
      nextCheckAt,
    },
  });

  // Update worker jobs
  await prisma.workerJob.deleteMany({
    where: { monitorId: id, status: 'PENDING' },
  });

  if (newEnabled && nextCheckAt) {
    await prisma.workerJob.create({
      data: {
        monitorId: id,
        scheduledAt: nextCheckAt,
      },
    });
  }

  logger.info({ monitorId: id, userId, enabled: newEnabled }, 'Monitor toggled');

  res.json({
    success: true,
    data: formatMonitor(updatedMonitor),
    meta: { timestamp: new Date().toISOString() },
  });
}));

// Trigger manual check
router.post('/:id/check', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const paramValidation = monitorIdParamSchema.safeParse(req.params);
  if (!paramValidation.success) {
    throw new ValidationError('Invalid monitor ID', { errors: paramValidation.error.errors });
  }

  const { id } = paramValidation.data;
  const userId = req.user!.id;

  const monitor = await prisma.monitor.findFirst({
    where: { id, userId },
    include: {
      checkResults: {
        take: 50,
        orderBy: { checkedAt: 'desc' },
        select: { status: true },
      },
    },
  });

  if (!monitor) {
    throw new NotFoundError('Monitor');
  }

  if (!monitor.enabled) {
    throw new ValidationError('Cannot check disabled monitor');
  }

  // Create immediate worker job (maxAttempts: 1 flags manual check to bypass schedule window)
  await prisma.workerJob.create({
    data: {
      monitorId: id,
      scheduledAt: new Date(),
      maxAttempts: 1,
    },
  });

  logger.info({ monitorId: id, userId }, 'Manual check triggered');

  res.json({
    success: true,
    data: { message: 'Check queued', monitorId: id },
    meta: { timestamp: new Date().toISOString() },
  });
}));

export { router as monitorsRouter };