/**
 * Core type definitions for Artha Monitor
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type MonitorInterval =
  | '1m'
  | '2m'
  | '3m'
  | '5m'
  | '10m'
  | '13m'
  | '14m'
  | '15m'
  | '20m'
  | '30m'
  | (string & {});

export type MonitorStatus = 'up' | 'down' | 'pending' | 'unknown' | 'maintenance';

export type CheckResultStatus = 'success' | 'failure' | 'timeout' | 'error';

export interface Monitor {
  id: string;
  userId: string;
  name: string;
  url: string;
  method: HttpMethod;
  interval: MonitorInterval;
  timeout: number; // in milliseconds
  expectedStatusCodes: number[];
  expectedResponseText?: string | null;
  headers?: Record<string, string> | null;
  body?: string | null;
  enabled: boolean;
  notificationSettings: NotificationSettings;
  activeWindowStart?: string | null;
  activeWindowEnd?: string | null;
  activeWindowTimezone?: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastCheckAt?: Date | null;
  nextCheckAt?: Date | null;
  currentStatus: MonitorStatus;
  uptimePercentage: number;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  emailOnDown: boolean;
  emailOnUp: boolean;
  webhookUrl?: string | null;
  webhookOnDown: boolean;
  webhookOnUp: boolean;
}

export interface CheckResult {
  id: string;
  monitorId: string;
  status: CheckResultStatus;
  statusCode?: number | null;
  responseTime: number; // in milliseconds
  responseBody?: string | null;
  errorMessage?: string | null;
  checkedAt: Date;
}

export type UptimePeriod = '24h' | '7d' | '30d' | '90d' | '365d';

export interface UptimeStats {
  monitorId: string;
  period: UptimePeriod;
  uptimePercentage: number;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  downtimeEvents: DowntimeEvent[];
}

export interface DowntimeEvent {
  id: string;
  monitorId: string;
  startedAt: Date;
  endedAt?: Date | null;
  duration?: number | null; // in seconds
  reason?: string | null;
}

export interface User {
  id: string;
  email: string;
  name?: string | null;
  passwordHash: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null;
  role: 'user' | 'admin';
  quota: UserQuota;
}

export interface UserQuota {
  maxMonitors: number;
  maxChecksPerMonth: number;
  minInterval: MonitorInterval;
  webhooksEnabled: boolean;
  apiAccess: boolean;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ResponseMeta {
  pagination?: PaginationMeta;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: ResponseMeta & {
    pagination: PaginationMeta;
  };
}

export interface CreateMonitorInput {
  name: string;
  url: string;
  method?: HttpMethod;
  interval: MonitorInterval;
  timeout?: number;
  expectedStatusCodes?: number[];
  expectedResponseText?: string;
  headers?: Record<string, string>;
  body?: string;
  notificationSettings?: Partial<NotificationSettings>;
  activeWindowStart?: string | null;
  activeWindowEnd?: string | null;
  activeWindowTimezone?: string | null;
}

export interface UpdateMonitorInput extends Partial<CreateMonitorInput> {
  enabled?: boolean;
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface PasswordResetRequestInput {
  email: string;
}

export interface PasswordResetInput {
  token: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface WorkerJob {
  id: string;
  monitorId: string;
  scheduledAt: Date;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  lockedAt?: Date | null;
  lockedBy?: string | null;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  checks: {
    database: 'up' | 'down';
    redis?: 'up' | 'down';
  };
  timestamp: string;
}