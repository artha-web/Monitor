/**
 * Artha Monitor Worker - Background Monitoring Service
 * Runs HTTP checks on scheduled intervals
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { pino } from 'pino';
import { Worker } from './worker.js';
import { Scheduler } from './scheduler.js';
import { intervalToMs } from './utils/intervals.js';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined
});

// Prisma client for worker
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

const WORKER_ID = process.env.WORKER_ID || `worker-${process.pid}-${Date.now()}`;
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '10', 10);
const JOB_TIMEOUT = parseInt(process.env.WORKER_JOB_TIMEOUT || '30000', 10);
const LEASE_DURATION = parseInt(process.env.WORKER_LEASE_DURATION || '60000', 10);
const CLEANUP_INTERVAL = parseInt(process.env.WORKER_CLEANUP_INTERVAL || '300000', 10);
const STUCK_JOB_THRESHOLD = parseInt(process.env.WORKER_STUCK_JOB_THRESHOLD || '120000', 10);

logger.info({ workerId: WORKER_ID }, 'Starting Artha Monitor Worker');

async function main() {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection established');

    // Initialize scheduler
    const scheduler = new Scheduler(prisma, logger, {
      workerId: WORKER_ID,
      leaseDuration: LEASE_DURATION,
      cleanupInterval: CLEANUP_INTERVAL,
      stuckJobThreshold: STUCK_JOB_THRESHOLD,
    });

    // Initialize worker
    const worker = new Worker(prisma, logger, {
      workerId: WORKER_ID,
      concurrency: CONCURRENCY,
      jobTimeout: JOB_TIMEOUT,
      intervalToMs,
    });

    // Start scheduler (creates jobs for due monitors)
    await scheduler.start();
    logger.info('Scheduler started');

    // Start worker (processes jobs)
    await worker.start();
    logger.info('Worker started');

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutdown signal received');

      await worker.stop();
      logger.info('Worker stopped');

      await scheduler.stop();
      logger.info('Scheduler stopped');

      await prisma.$disconnect();
      logger.info('Database disconnected');

      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Keep process alive
    setInterval(() => {}, 1000);

  } catch (error) {
    logger.fatal({ error }, 'Failed to start worker');
    process.exit(1);
  }
}

main();