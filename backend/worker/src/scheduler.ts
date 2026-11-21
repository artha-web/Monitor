/**
 * Scheduler - Creates monitoring jobs for due monitors
 * Runs periodically to ensure jobs are created on schedule
 */

import { PrismaClient } from '@prisma/client';
import { pino, Logger } from 'pino';

export interface SchedulerConfig {
  workerId: string;
  leaseDuration: number;
  cleanupInterval: number;
  stuckJobThreshold: number;
}

export class Scheduler {
  private prisma: PrismaClient;
  private logger: Logger;
  private config: SchedulerConfig;
  private running = false;
  private scheduleInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly SCHEDULE_INTERVAL_MS = 10000; // Check every 10 seconds

  constructor(prisma: PrismaClient, logger: Logger, config: SchedulerConfig) {
    this.prisma = prisma;
    this.logger = logger.child({ component: 'scheduler' });
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.logger.info('Scheduler starting');

    // Run initial schedule
    await this.scheduleDueMonitors();

    // Schedule periodic job creation
    this.scheduleInterval = setInterval(async () => {
      if (!this.running) return;
      try {
        await this.scheduleDueMonitors();
      } catch (error) {
        this.logger.error({ error }, 'Error scheduling monitors');
      }
    }, this.SCHEDULE_INTERVAL_MS);

    // Schedule cleanup of stuck jobs
    this.cleanupInterval = setInterval(async () => {
      if (!this.running) return;
      try {
        await this.cleanupStuckJobs();
      } catch (error) {
        this.logger.error({ error }, 'Error cleaning up stuck jobs');
      }
    }, this.config.cleanupInterval);
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.scheduleInterval) {
      clearInterval(this.scheduleInterval);
      this.scheduleInterval = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.logger.info('Scheduler stopped');
  }

  private async scheduleDueMonitors(): Promise<void> {
    const now = new Date();
    const nearFuture = new Date(now.getTime() + this.SCHEDULE_INTERVAL_MS * 2);

    // Find enabled monitors that need a job scheduled
    const monitors = await this.prisma.monitor.findMany({
      where: {
        enabled: true,
        nextCheckAt: { lte: nearFuture },
      },
      select: { id: true, nextCheckAt: true },
    });

    if (monitors.length === 0) return;

    this.logger.debug({ count: monitors.length }, 'Scheduling monitors');

    // Single query to find which monitors already have an active job (Fix N+1 query loop)
    const monitorIds = monitors.map((m) => m.id);
    const existingActiveJobs = await this.prisma.workerJob.findMany({
      where: {
        monitorId: { in: monitorIds },
        status: { in: ['PENDING', 'PROCESSING'] },
      },
      select: { monitorId: true },
    });

    const activeMonitorIds = new Set(existingActiveJobs.map((j) => j.monitorId));
    const newJobsData = monitors
      .filter((m) => !activeMonitorIds.has(m.id))
      .map((m) => ({
        monitorId: m.id,
        scheduledAt: m.nextCheckAt || now,
      }));

    if (newJobsData.length > 0) {
      await this.prisma.workerJob.createMany({
        data: newJobsData,
      });
    }
  }

  private async cleanupStuckJobs(): Promise<void> {
    const threshold = new Date(Date.now() - this.config.stuckJobThreshold);

    // Clean up any stray completed or failed jobs older than 1 hour to prevent table bloat
    const staleCompletedThreshold = new Date(Date.now() - 60 * 60 * 1000);
    await this.prisma.workerJob
      .deleteMany({
        where: {
          status: { in: ['COMPLETED', 'FAILED'] },
          updatedAt: { lt: staleCompletedThreshold },
        },
      })
      .catch(() => {});

    // Find jobs stuck in PROCESSING state
    const stuckJobs = await this.prisma.workerJob.findMany({
      where: {
        status: 'PROCESSING',
        lockedAt: { lt: threshold },
      },
      select: { id: true, monitorId: true, lockedBy: true, attempts: true, maxAttempts: true },
    });

    if (stuckJobs.length === 0) return;

    this.logger.warn({ count: stuckJobs.length }, 'Found stuck jobs, resetting');

    for (const job of stuckJobs) {
      if (job.attempts >= job.maxAttempts) {
        // Mark as failed
        await this.prisma.workerJob.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            lockedAt: null,
            lockedBy: null,
          },
        });
        this.logger.warn({ jobId: job.id }, 'Stuck job marked as failed');
      } else {
        // Reset to pending for retry
        await this.prisma.workerJob.update({
          where: { id: job.id },
          data: {
            status: 'PENDING',
            scheduledAt: new Date(),
            lockedAt: null,
            lockedBy: null,
          },
        });
        this.logger.warn({ jobId: job.id }, 'Stuck job reset for retry');
      }
    }
  }

  // Method to manually trigger scheduling (useful for testing)
  async triggerSchedule(): Promise<void> {
    await this.scheduleDueMonitors();
  }
}