/**
 * Worker - Processes monitoring jobs
 * Executes HTTP checks and records results
 */

import { PrismaClient, CheckResultStatus, MonitorStatus, JobStatus } from '@prisma/client';
import { pino, Logger } from 'pino';
import { intervalToMs, calculateNextCheckAt, isWithinActiveWindow, MonitorInterval } from './utils/intervals.js';

export interface WorkerConfig {
  workerId: string;
  concurrency: number;
  jobTimeout: number;
  intervalToMs: (interval: MonitorInterval) => number;
}

interface Job {
  id: string;
  monitorId: string;
  scheduledAt: Date;
  attempts: number;
  maxAttempts: number;
}

interface Monitor {
  id: string;
  userId: string;
  name: string;
  url: string;
  method: string;
  interval: string;
  enabled: boolean;
  timeout: number;
  expectedStatusCodes: number[];
  expectedResponseText: string | null;
  headers: Record<string, string> | null;
  body: string | null;
  activeWindowStart: string | null;
  activeWindowEnd: string | null;
  activeWindowTimezone: string | null;
  notificationSettings?: {
    webhookUrl?: string | null;
    webhookOnDown?: boolean;
    webhookOnUp?: boolean;
    emailEnabled?: boolean;
  } | null | any;
}

export class Worker {
  private prisma: PrismaClient;
  private logger: Logger;
  private config: WorkerConfig;
  private running = false;
  private processingCount = 0;
  private pollInterval: NodeJS.Timeout | null = null;
  private readonly POLL_INTERVAL_MS = 5000; // Poll for jobs every 5 seconds

  constructor(prisma: PrismaClient, logger: Logger, config: WorkerConfig) {
    this.prisma = prisma;
    this.logger = logger.child({ component: 'worker' });
    this.config = config;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.logger.info({ concurrency: this.config.concurrency }, 'Worker starting');
    this.pollForJobs();
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    // Wait for in-flight jobs to complete (max 30 seconds)
    const startWait = Date.now();
    while (this.processingCount > 0 && Date.now() - startWait < 30000) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.logger.info('Worker stopped');
  }

  private pollForJobs(): void {
    if (!this.running) return;

    this.pollInterval = setInterval(async () => {
      if (!this.running) return;
      try {
        await this.drainJobQueue();
      } catch (error) {
        this.logger.error({ error }, 'Error polling for jobs');
      }
    }, this.POLL_INTERVAL_MS);

    // Also run immediately
    this.drainJobQueue().catch((error) => {
      this.logger.error({ error }, 'Error in initial job processing');
    });
  }

  private async drainJobQueue(): Promise<void> {
    while (this.running && this.processingCount < this.config.concurrency) {
      const job = await this.claimJob();
      if (!job) break; // No more pending jobs currently due

      this.processingCount++;
      this.processJob(job).finally(() => {
        this.processingCount--;
        // Eagerly pull next job when a concurrency slot opens
        if (this.running && this.processingCount < this.config.concurrency) {
          this.drainJobQueue().catch(() => {});
        }
      });
    }
  }

  private async claimJob(): Promise<Job | null> {
    // Use a transaction to atomically claim a job
    const job = await this.prisma.$transaction(async (tx) => {
      // Find oldest pending job that's due
      const pendingJob = await tx.workerJob.findFirst({
        where: {
          status: 'PENDING',
          scheduledAt: { lte: new Date() },
        },
        orderBy: { scheduledAt: 'asc' },
      });

      if (!pendingJob) return null;

      // Try to claim it
      const claimed = await tx.workerJob.updateMany({
        where: {
          id: pendingJob.id,
          status: 'PENDING',
        },
        data: {
          status: 'PROCESSING',
          lockedAt: new Date(),
          lockedBy: this.config.workerId,
          attempts: { increment: 1 },
        },
      });

      if (claimed.count === 0) return null;

      return {
        id: pendingJob.id,
        monitorId: pendingJob.monitorId,
        scheduledAt: pendingJob.scheduledAt,
        attempts: pendingJob.attempts + 1,
        maxAttempts: pendingJob.maxAttempts,
      };
    });

    return job;
  }

  private async processJob(job: Job): Promise<void> {
    const startTime = Date.now();
    this.logger.debug({ jobId: job.id, monitorId: job.monitorId }, 'Processing job');

    try {
      // Get monitor details
      const monitor = await this.getMonitor(job.monitorId);
      if (!monitor) {
        this.logger.warn({ jobId: job.id, monitorId: job.monitorId }, 'Monitor not found');
        await this.completeJob(job.id, 'COMPLETED');
        return;
      }

      if (!monitor.enabled) {
        this.logger.debug({ jobId: job.id, monitorId: job.monitorId }, 'Monitor disabled, skipping');
        await this.completeJob(job.id, 'COMPLETED');
        return;
      }

      // Check active time window (manual checks with maxAttempts === 1 bypass schedule window)
      const isManualCheck = job.maxAttempts === 1;
      if (
        !isManualCheck &&
        !isWithinActiveWindow({
          activeWindowStart: monitor.activeWindowStart,
          activeWindowEnd: monitor.activeWindowEnd,
          timezone: monitor.activeWindowTimezone,
        })
      ) {
        const nextCheckAt = calculateNextCheckAt({
          interval: monitor.interval,
          activeWindowStart: monitor.activeWindowStart,
          activeWindowEnd: monitor.activeWindowEnd,
          timezone: monitor.activeWindowTimezone,
        });
        this.logger.info(
          {
            monitorId: monitor.id,
            activeWindow: `${monitor.activeWindowStart}-${monitor.activeWindowEnd}`,
            nextCheckAt: nextCheckAt.toISOString(),
          },
          'Monitor is outside active schedule window. Rescheduling for next window.'
        );

        // Close any active downtime events so off-schedule hours do not accumulate as outage duration
        const activeDowntime = await this.prisma.downtimeEvent.findFirst({
          where: { monitorId: monitor.id, endedAt: null },
        });
        if (activeDowntime) {
          const duration = Math.max(0, Math.floor((Date.now() - activeDowntime.startedAt.getTime()) / 1000));
          await this.prisma.downtimeEvent.update({
            where: { id: activeDowntime.id },
            data: { endedAt: new Date(), duration },
          });
        }

        await this.prisma.$transaction(async (tx) => {
          await tx.monitor.update({
            where: { id: monitor.id },
            data: { nextCheckAt },
          });
          await tx.workerJob.create({
            data: {
              monitorId: monitor.id,
              scheduledAt: nextCheckAt,
            },
          });
        });

        await this.completeJob(job.id, 'COMPLETED');
        return;
      }

      // Execute HTTP check
      const result = await this.executeCheck(monitor);

      // Save check result
      await this.saveCheckResult(monitor.id, result);

      // Update monitor status and schedule next check
      await this.updateMonitorAfterCheck(monitor, result);

      // Complete job
      await this.completeJob(job.id, 'COMPLETED');

      const duration = Date.now() - startTime;
      this.logger.info({
        jobId: job.id,
        monitorId: job.monitorId,
        status: result.status,
        responseTime: result.responseTime,
        duration
      }, 'Job completed');

    } catch (error) {
      this.logger.error({ error, jobId: job.id }, 'Job failed');
      await this.handleJobFailure(job, error);
    }
  }

  private async getMonitor(monitorId: string): Promise<Monitor | null> {
    const monitor = await this.prisma.monitor.findUnique({
      where: { id: monitorId },
      select: {
        id: true,
        userId: true,
        name: true,
        url: true,
        method: true,
        interval: true,
        timeout: true,
        expectedStatusCodes: true,
        expectedResponseText: true,
        headers: true,
        body: true,
        enabled: true,
        activeWindowStart: true,
        activeWindowEnd: true,
        activeWindowTimezone: true,
        notificationSettings: true,
      },
    });

    if (!monitor) return null;

    return {
      ...monitor,
      headers: monitor.headers as Record<string, string> | null,
      notificationSettings: monitor.notificationSettings as any,
    };
  }

  private async executeCheck(monitor: Monitor): Promise<{
    status: CheckResultStatus;
    statusCode: number | null;
    responseTime: number;
    responseBody: string | null;
    errorMessage: string | null;
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), monitor.timeout);

    const checkStartTime = Date.now();

    try {
      const hasBody = monitor.method !== 'GET' && monitor.method !== 'HEAD' && !!monitor.body;
      const response = await fetch(monitor.url, {
        method: monitor.method,
        headers: {
          'User-Agent': 'ArthaMonitor/1.0',
          ...monitor.headers,
        },
        body: hasBody ? monitor.body : undefined,
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - checkStartTime;

      const rawText = await response.text().catch(() => null);
      // Truncate response body to max 10KB to prevent OOM and database bloat
      const responseBody = rawText ? rawText.slice(0, 10000) : null;

      // Check status code
      const statusCode = response.status;
      const expectedCodes = monitor.expectedStatusCodes;
      const statusCodeMatch = expectedCodes.includes(statusCode);

      // Check expected response text
      let responseTextMatch = true;
      if (monitor.expectedResponseText && responseBody) {
        responseTextMatch = responseBody.includes(monitor.expectedResponseText);
      }

      let status: CheckResultStatus;
      let errorMessage: string | null = null;

      if (!statusCodeMatch) {
        status = 'FAILURE';
        errorMessage = `Unexpected status code: ${statusCode} (expected: ${expectedCodes.join(', ')})`;
      } else if (!responseTextMatch) {
        status = 'FAILURE';
        errorMessage = `Expected response text not found`;
      } else {
        status = 'SUCCESS';
      }

      return {
        status,
        statusCode,
        responseTime,
        responseBody: responseBody?.slice(0, 10000) || null, // Limit response body size
        errorMessage,
      };

    } catch (error) {
      clearTimeout(timeoutId);
      const responseTime = Date.now() - checkStartTime;

      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          status: 'TIMEOUT',
          statusCode: null,
          responseTime,
          responseBody: null,
          errorMessage: `Request timeout after ${monitor.timeout}ms`,
        };
      }

      return {
        status: 'ERROR',
        statusCode: null,
        responseTime,
        responseBody: null,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async saveCheckResult(
    monitorId: string,
    result: {
      status: CheckResultStatus;
      statusCode: number | null;
      responseTime: number;
      responseBody: string | null;
      errorMessage: string | null;
    }
  ): Promise<void> {
    await this.prisma.checkResult.create({
      data: {
        monitorId,
        status: result.status,
        statusCode: result.statusCode,
        responseTime: result.responseTime,
        responseBody: result.responseBody,
        errorMessage: result.errorMessage,
      },
    });
  }

  private async updateMonitorAfterCheck(
    monitor: Monitor,
    result: {
      status: CheckResultStatus;
      statusCode: number | null;
      responseTime: number;
      errorMessage: string | null;
    }
  ): Promise<void> {
    const now = new Date();
    const nextCheckAt = calculateNextCheckAt({
      interval: monitor.interval,
      activeWindowStart: monitor.activeWindowStart,
      activeWindowEnd: monitor.activeWindowEnd,
      timezone: monitor.activeWindowTimezone,
      fromDate: now,
    });

    let newStatus: MonitorStatus;
    if (result.status === 'SUCCESS') {
      newStatus = 'UP';
    } else if (result.status === 'TIMEOUT') {
      newStatus = 'DOWN';
    } else {
      newStatus = 'DOWN';
    }

    // Check if status changed to create downtime event
    const currentMonitor = await this.prisma.monitor.findUnique({
      where: { id: monitor.id },
      select: { currentStatus: true },
    });

    await this.prisma.$transaction(async (tx) => {
      // Update monitor
      await tx.monitor.update({
        where: { id: monitor.id },
        data: {
          currentStatus: newStatus,
          lastCheckAt: now,
          nextCheckAt,
        },
      });

      // Handle downtime events
      if (currentMonitor) {
        if (newStatus === 'DOWN' && currentMonitor.currentStatus !== 'DOWN') {
          // Transition to DOWN: ensure any open event is handled, and open a new downtime event
          const activeDowntime = await tx.downtimeEvent.findFirst({
            where: { monitorId: monitor.id, endedAt: null },
            orderBy: { startedAt: 'desc' },
          });

          if (!activeDowntime) {
            await tx.downtimeEvent.create({
              data: {
                monitorId: monitor.id,
                startedAt: now,
                reason: result.errorMessage || `Status: ${result.status}`,
              },
            });
          }
        } else if (newStatus === 'UP' && currentMonitor.currentStatus !== 'UP') {
          // Transition to UP: close ALL open downtime events for this monitor
          const openDowntimes = await tx.downtimeEvent.findMany({
            where: { monitorId: monitor.id, endedAt: null },
          });

          for (const event of openDowntimes) {
            const duration = Math.max(0, Math.floor((now.getTime() - event.startedAt.getTime()) / 1000));
            await tx.downtimeEvent.update({
              where: { id: event.id },
              data: {
                endedAt: now,
                duration,
              },
            });
          }
        }
      }

      // Schedule next job
      await tx.workerJob.create({
        data: {
          monitorId: monitor.id,
          scheduledAt: nextCheckAt,
        },
      });
    });

    // Dispatch webhook notification on status transition
    const notif = monitor.notificationSettings as {
      webhookUrl?: string | null;
      webhookOnDown?: boolean;
      webhookOnUp?: boolean;
    } | null;

    if (notif?.webhookUrl && currentMonitor && currentMonitor.currentStatus !== newStatus) {
      const shouldNotify =
        (newStatus === 'DOWN' && Boolean(notif.webhookOnDown)) ||
        (newStatus === 'UP' && Boolean(notif.webhookOnUp));

      if (shouldNotify) {
        fetch(notif.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: newStatus === 'DOWN' ? 'monitor.down' : 'monitor.up',
            monitor: { id: monitor.id, name: monitor.name, url: monitor.url },
            status: newStatus,
            timestamp: now.toISOString(),
            reason: result.errorMessage || `Status: ${result.status}`,
          }),
        }).catch((err) => {
          this.logger.warn({ error: err.message, monitorId: monitor.id }, 'Failed to deliver webhook notification');
        });
      }
    }
  }

  private async completeJob(jobId: string, status: JobStatus): Promise<void> {
    if (status === 'COMPLETED') {
      // Delete completed jobs immediately to prevent table bloat
      await this.prisma.workerJob
        .delete({
          where: { id: jobId },
        })
        .catch(() => {});
    } else {
      await this.prisma.workerJob.update({
        where: { id: jobId },
        data: {
          status,
          lockedAt: null,
          lockedBy: null,
        },
      });
    }
  }

  private async handleJobFailure(job: Job, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (job.attempts >= job.maxAttempts) {
      // Max retries reached, mark as failed
      await this.prisma.workerJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          lockedAt: null,
          lockedBy: null,
        },
      });
      this.logger.error({ jobId: job.id, attempts: job.attempts }, 'Job failed permanently');
    } else {
      // Retry with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, job.attempts), 30000); // Max 30 seconds
      const retryAt = new Date(Date.now() + delay);

      await this.prisma.workerJob.update({
        where: { id: job.id },
        data: {
          status: 'PENDING',
          scheduledAt: retryAt,
          lockedAt: null,
          lockedBy: null,
        },
      });
      this.logger.warn({ jobId: job.id, attempt: job.attempts, retryAt }, 'Job scheduled for retry');
    }
  }
}