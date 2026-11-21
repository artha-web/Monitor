/**
 * Health check routes
 */

import { Router, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { logger } from '../index.js';
import { healthCheckResponseSchema, type HealthCheckResponse } from '@artha-monitor/shared';

const router = Router();

router.get('/', async (_req, res: Response) => {
  const startTime = Date.now();

  // Check database connection
  let databaseStatus: 'up' | 'down' = 'up';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    logger.error({ error }, 'Database health check failed');
    databaseStatus = 'down';
  }

  // Check Redis if configured
  let redisStatus: 'up' | 'down' | undefined;
  if (process.env.REDIS_URL) {
    // Redis check would go here if using Redis
    redisStatus = 'up';
  }

  const uptime = process.uptime();
  const overallStatus = databaseStatus === 'up' ? 'healthy' : 'unhealthy';

  const response: HealthCheckResponse = {
    status: overallStatus,
    version: process.env.APP_VERSION || '1.0.0',
    uptime,
    checks: {
      database: databaseStatus,
      redis: redisStatus,
    },
    timestamp: new Date().toISOString(),
  };

  // Validate response shape
  const validation = healthCheckResponseSchema.safeParse(response);
  if (!validation.success) {
    logger.warn({ validationErrors: validation.error.errors }, 'Health check response validation failed');
  }

  const statusCode = overallStatus === 'healthy' ? 200 : 503;
  res.status(statusCode).json({
    success: true,
    data: response,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});

router.get('/ready', async (_req, res: Response) => {
  // Readiness check - more thorough than liveness
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      data: { ready: true },
      meta: { timestamp: new Date().toISOString() },
    });
  } catch (error) {
    logger.error({ error }, 'Readiness check failed');
    res.status(503).json({
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Service not ready' },
      meta: { timestamp: new Date().toISOString() },
    });
  }
});

router.get('/live', (_req, res: Response) => {
  // Liveness check - just confirms process is running
  res.json({
    success: true,
    data: { alive: true },
    meta: { timestamp: new Date().toISOString() },
  });
});

export { router as healthRouter };