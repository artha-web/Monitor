/**
 * Shared constants for Artha Monitor
 */

export const SUPPORTED_INTERVALS = [
  { value: '1m', label: '1 minute', milliseconds: 60_000 },
  { value: '2m', label: '2 minutes', milliseconds: 120_000 },
  { value: '3m', label: '3 minutes', milliseconds: 180_000 },
  { value: '5m', label: '5 minutes', milliseconds: 300_000 },
  { value: '10m', label: '10 minutes', milliseconds: 600_000 },
  { value: '13m', label: '13 minutes', milliseconds: 780_000 },
  { value: '14m', label: '14 minutes', milliseconds: 840_000 },
  { value: '15m', label: '15 minutes', milliseconds: 900_000 },
  { value: '20m', label: '20 minutes', milliseconds: 1_200_000 },
  { value: '30m', label: '30 minutes', milliseconds: 1_800_000 },
  { value: '1h', label: '1 hour', milliseconds: 3_600_000 },
] as const;

export const DEFAULT_MONITOR_CONFIG = {
  method: 'GET' as const,
  timeout: 10_000, // 10 seconds
  expectedStatusCodes: [200],
  enabled: true,
  notificationSettings: {
    emailEnabled: true,
    emailOnDown: true,
    emailOnUp: true,
    webhookOnDown: false,
    webhookOnUp: false,
  },
} as const;

export const MONITOR_STATUS_COLORS = {
  up: 'text-green-600 bg-green-100',
  down: 'text-red-600 bg-red-100',
  pending: 'text-yellow-600 bg-yellow-100',
  unknown: 'text-gray-600 bg-gray-100',
  maintenance: 'text-blue-600 bg-blue-100',
} as const;

export const CHECK_RESULT_STATUS_COLORS = {
  success: 'text-green-600',
  failure: 'text-red-600',
  timeout: 'text-orange-600',
  error: 'text-purple-600',
} as const;

export const HTTP_METHODS = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'HEAD', label: 'HEAD' },
  { value: 'OPTIONS', label: 'OPTIONS' },
] as const;

export const DEFAULT_USER_QUOTA = {
  maxMonitors: 50,
  maxChecksPerMonth: 100_000,
  minInterval: '1m' as const,
  webhooksEnabled: false,
  apiAccess: true,
} as const;

export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 30, // 30 days
  path: '/',
} as const;

export const REFRESH_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 60 * 60 * 24 * 90, // 90 days
} as const;

export const RATE_LIMITS = {
  auth: { windowMs: 15 * 60 * 1000, max: 20 }, // 20 requests per 15 minutes
  api: { windowMs: 60 * 1000, max: 100 }, // 100 requests per minute
  monitorCreate: { windowMs: 60 * 60 * 1000, max: 50 }, // 50 monitors per hour
  checkResults: { windowMs: 60 * 1000, max: 60 }, // 60 requests per minute
} as const;

export const WORKER_CONFIG = {
  concurrency: 10,
  jobTimeout: 30_000, // 30 seconds
  leaseDuration: 60_000, // 1 minute
  maxRetries: 3,
  retryDelay: 5_000, // 5 seconds
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
  stuckJobThreshold: 2 * 60 * 1000, // 2 minutes
} as const;

export const DATABASE_CONFIG = {
  connectionLimit: 10,
  queryTimeout: 10_000,
  transactionTimeout: 30_000,
} as const;

export const PAGINATION_DEFAULTS = {
  defaultLimit: 20,
  maxLimit: 100,
} as const;

export const UPTIME_PERIODS = [
  { value: '24h', label: 'Last 24 hours', hours: 24 },
  { value: '7d', label: 'Last 7 days', hours: 168 },
  { value: '30d', label: 'Last 30 days', hours: 720 },
  { value: '90d', label: 'Last 90 days', hours: 2160 },
  { value: '365d', label: 'Last 365 days', hours: 8760 },
] as const;

export const STATUS_PAGE_REFRESH_INTERVAL = 30_000; // 30 seconds