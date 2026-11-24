/**
 * Zod validation schemas for Artha Monitor
 * Shared across frontend, API, and worker
 */

import { z } from 'zod';
import type {
  HttpMethod,
  MonitorInterval,
  MonitorStatus,
  CheckResultStatus,
} from './types';

// HTTP Method schema
export const httpMethodSchema = z.enum([
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'
]) satisfies z.ZodType<HttpMethod>;

// Monitor interval schema
export const monitorIntervalSchema = z
  .string()
  .regex(/^\d+[smhd]$/i, 'Interval must be a number followed by s, m, h, or d (e.g. 1m, 14m, 1h)') satisfies z.ZodType<MonitorInterval>;

// Monitor status schema
export const monitorStatusSchema = z.enum([
  'up', 'down', 'pending', 'unknown', 'maintenance', 'paused'
]) satisfies z.ZodType<MonitorStatus>;

// Check result status schema
export const checkResultStatusSchema = z.enum([
  'success', 'failure', 'timeout', 'error'
]) satisfies z.ZodType<CheckResultStatus>;

// Notification settings schema
export const notificationSettingsSchema = z.object({
  emailEnabled: z.boolean().default(true),
  emailOnDown: z.boolean().default(true),
  emailOnUp: z.boolean().default(true),
  webhookUrl: z.string().url().optional().nullable(),
  webhookOnDown: z.boolean().default(false),
  webhookOnUp: z.boolean().default(false),
});

// Base monitor input schema object
export const baseMonitorInputSchema = z.object({
  name: z.string().min(1, 'Monitor name is required').max(100, 'Name too long'),
  url: z.string().url('Invalid URL format'),
  method: httpMethodSchema.default('GET'),
  interval: monitorIntervalSchema,
  timeout: z.number().int().min(1000).max(60000).default(10000), // 1s to 60s
  expectedStatusCodes: z.array(z.number().int().min(100).max(599)).min(1).default([200]),
  expectedResponseText: z.string().max(1000).optional(),
  headers: z.record(z.string()).optional(),
  body: z.string().max(10000).optional(),
  notificationSettings: notificationSettingsSchema.partial().optional(),
  activeWindowStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be HH:mm (e.g. 07:00)').optional().nullable(),
  activeWindowEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be HH:mm (e.g. 12:00)').optional().nullable(),
  activeWindowTimezone: z.string().max(60).optional().nullable(),
});

const validateWindowDuration = (data: { activeWindowStart?: string | null; activeWindowEnd?: string | null; interval?: MonitorInterval }) => {
  if (data.activeWindowStart && data.activeWindowEnd) {
    const [startH = 0, startM = 0] = data.activeWindowStart.split(':').map(Number);
    const [endH = 0, endM = 0] = data.activeWindowEnd.split(':').map(Number);
    let windowMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (windowMinutes < 0) windowMinutes += 24 * 60; // overnight window
    
    const intervalMinutes = data.interval === '1m' ? 1
      : data.interval === '5m' ? 5
      : data.interval === '10m' ? 10
      : data.interval === '15m' ? 15
      : data.interval === '30m' ? 30
      : data.interval === '1h' ? 60
      : data.interval === '6h' ? 360
      : data.interval === '12h' ? 720
      : data.interval === '24h' ? 1440 : 1;

    return windowMinutes >= intervalMinutes;
  }
  return true;
};

// Create monitor input schema
export const createMonitorSchema = baseMonitorInputSchema.refine(
  validateWindowDuration,
  {
    message: 'Active schedule window duration must be at least as long as the monitor interval',
    path: ['activeWindowEnd'],
  }
);

// Update monitor input schema
export const updateMonitorSchema = baseMonitorInputSchema.partial().extend({
  enabled: z.boolean().optional(),
}).refine(
  validateWindowDuration,
  {
    message: 'Active schedule window duration must be at least as long as the monitor interval',
    path: ['activeWindowEnd'],
  }
);

// Register input schema
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  name: z.string().max(100).optional(),
});

// Login input schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Password reset request schema
export const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Password reset schema
export const passwordResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

// Monitor ID param schema
export const monitorIdParamSchema = z
  .object({
    id: z.string().uuid('Invalid monitor ID').optional(),
    monitorId: z.string().uuid('Invalid monitor ID').optional(),
  })
  .refine((data) => !!(data.id || data.monitorId), {
    message: 'Monitor ID is required',
  })
  .transform((data) => ({
    id: (data.id || data.monitorId) as string,
    monitorId: (data.monitorId || data.id) as string,
  }));

// Pagination query schema
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Check results query schema
export const checkResultsQuerySchema = paginationQuerySchema.extend({
  status: checkResultStatusSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// Uptime stats query schema
export const uptimeStatsQuerySchema = z.object({
  period: z.enum(['24h', '7d', '30d', '90d', '365d']).default('7d'),
});

// API Response schemas
export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

export const paginationMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export const responseMetaSchema = z.object({
  pagination: paginationMetaSchema.optional(),
  timestamp: z.string(),
});

export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: apiErrorSchema.optional(),
    meta: responseMetaSchema.optional(),
  });

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  apiResponseSchema(z.array(dataSchema)).extend({
    meta: responseMetaSchema.extend({
      pagination: paginationMetaSchema,
    }),
  });

// Monitor response schema
export const monitorResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  url: z.string().url(),
  method: httpMethodSchema,
  interval: monitorIntervalSchema,
  timeout: z.number().int(),
  expectedStatusCodes: z.array(z.number().int()),
  expectedResponseText: z.string().nullable().optional(),
  headers: z.record(z.string()).nullable().optional(),
  body: z.string().nullable().optional(),
  enabled: z.boolean(),
  notificationSettings: notificationSettingsSchema,
  activeWindowStart: z.string().nullable().optional(),
  activeWindowEnd: z.string().nullable().optional(),
  activeWindowTimezone: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastCheckAt: z.string().datetime().nullable().optional(),
  nextCheckAt: z.string().datetime().nullable().optional(),
  currentStatus: monitorStatusSchema,
  uptimePercentage: z.number().min(0).max(100),
});

// Check result response schema
export const checkResultResponseSchema = z.object({
  id: z.string().uuid(),
  monitorId: z.string().uuid(),
  status: checkResultStatusSchema,
  statusCode: z.number().int().nullable().optional(),
  responseTime: z.number().int(),
  responseBody: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  checkedAt: z.string().datetime(),
});

// Downtime event schema
export const downtimeEventSchema = z.object({
  id: z.string().uuid(),
  monitorId: z.string().uuid(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable().optional(),
  duration: z.number().int().nullable().optional(),
  reason: z.string().nullable().optional(),
});

// Uptime stats schema
export const uptimeStatsSchema = z.object({
  monitorId: z.string().uuid(),
  period: z.enum(['24h', '7d', '30d', '90d', '365d']),
  uptimePercentage: z.number().min(0).max(100),
  totalChecks: z.number().int().min(0),
  successfulChecks: z.number().int().min(0),
  failedChecks: z.number().int().min(0),
  averageResponseTime: z.number().min(0),
  minResponseTime: z.number().min(0),
  maxResponseTime: z.number().min(0),
  downtimeEvents: z.array(downtimeEventSchema),
  // Real bucketed time-series for the uptime chart
  timeSeries: z.array(z.object({
    date: z.string(),
    uptime: z.number().min(0).max(100),
  })).optional(),
});

// User response schema (without sensitive data)
export const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable().optional(),
  emailVerified: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastLoginAt: z.string().datetime().nullable().optional(),
  role: z.enum(['user', 'admin']),
  quota: z.object({
    maxMonitors: z.number().int(),
    maxChecksPerMonth: z.number().int(),
    minInterval: monitorIntervalSchema,
    webhooksEnabled: z.boolean(),
    apiAccess: z.boolean(),
  }),
});

// Health check response schema
export const healthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  version: z.string(),
  uptime: z.number(),
  checks: z.object({
    database: z.enum(['up', 'down']),
    redis: z.enum(['up', 'down']).optional(),
  }),
  timestamp: z.string().datetime(),
});

// Export inferred types
export type MonitorIdParam = z.infer<typeof monitorIdParamSchema>;
export type PaginationQuery = z.input<typeof paginationQuerySchema>;
export type CheckResultsQuery = z.input<typeof checkResultsQuerySchema>;
export type UptimeStatsQuery = z.input<typeof uptimeStatsQuerySchema>;
export type MonitorResponse = z.infer<typeof monitorResponseSchema>;
export type CheckResultResponse = z.infer<typeof checkResultResponseSchema>;
export type DowntimeEventResponse = z.infer<typeof downtimeEventSchema>;
export type UptimeStatsResponse = z.infer<typeof uptimeStatsSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;