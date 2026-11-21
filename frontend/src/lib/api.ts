import {
  MonitorResponse,
  CheckResultResponse,
  UptimeStatsResponse,
  DowntimeEventResponse,
  UserResponse,
  CreateMonitorInput,
  UpdateMonitorInput,
  PaginationQuery,
  CheckResultsQuery,
  UptimeStatsQuery,
} from '@artha-monitor/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface ApiResponse<T, M = any> {
  data: T;
  meta?: M;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MonitorListResponse {
  monitors: MonitorResponse[];
  meta?: {
    timestamp: string;
    pagination: PaginationMeta;
    quota?: {
      used: number;
      max: number;
    };
  };
}

export interface CheckResultsListResponse {
  results: CheckResultResponse[];
  meta?: {
    timestamp: string;
    pagination: PaginationMeta;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error?.message || 'Request failed');
    }

    return body.data;
  }

  private async requestWithResponse<T, M = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T, M>> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error?.message || 'Request failed');
    }

    return { data: body.data, meta: body.meta };
  }

  // Auth
  async login(email: string, password: string): Promise<{ user: UserResponse }> {
    const user = await this.request<UserResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return { user };
  }

  async register(email: string, password: string, name?: string): Promise<{ user: UserResponse }> {
    const user = await this.request<UserResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    return { user };
  }

  async logout(): Promise<void> {
    return this.request('/auth/logout', { method: 'POST' });
  }

  async getMe(): Promise<UserResponse> {
    return this.request<UserResponse>('/auth/me');
  }

  async refreshToken(): Promise<void> {
    return this.request('/auth/refresh', { method: 'POST' });
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    return this.request('/auth/password/reset-request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    return this.request('/auth/password/reset', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  // Monitors
  async getMonitors(params?: PaginationQuery): Promise<MonitorListResponse> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && (value as any) !== '') {
          searchParams.set(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    const res = await this.requestWithResponse<MonitorResponse[]>(
      `/monitors${query ? `?${query}` : ''}`
    );
    return {
      monitors: Array.isArray(res.data) ? res.data : [],
      meta: res.meta,
    };
  }

  async getMonitor(id: string): Promise<MonitorResponse> {
    return this.request<MonitorResponse>(`/monitors/${id}`);
  }

  async createMonitor(data: CreateMonitorInput): Promise<MonitorResponse> {
    return this.request<MonitorResponse>('/monitors', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMonitor(id: string, data: UpdateMonitorInput): Promise<MonitorResponse> {
    return this.request<MonitorResponse>(`/monitors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteMonitor(id: string): Promise<void> {
    return this.request(`/monitors/${id}`, { method: 'DELETE' });
  }

  async toggleMonitor(id: string): Promise<MonitorResponse> {
    return this.request<MonitorResponse>(`/monitors/${id}/toggle`, {
      method: 'POST',
    });
  }

  async triggerCheck(id: string): Promise<{ message: string; result?: any }> {
    return this.request(`/monitors/${id}/check`, { method: 'POST' });
  }

  // Check Results
  async getCheckResults(monitorId: string, params?: CheckResultsQuery): Promise<CheckResultsListResponse> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && (value as any) !== '') {
          searchParams.set(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    const res = await this.requestWithResponse<CheckResultResponse[]>(
      `/check-results/monitor/${monitorId}${query ? `?${query}` : ''}`
    );
    return {
      results: Array.isArray(res.data) ? res.data : [],
      meta: res.meta,
    };
  }

  async getLatestCheckResult(monitorId: string): Promise<CheckResultResponse | null> {
    return this.request<CheckResultResponse | null>(
      `/check-results/monitor/${monitorId}/latest`
    );
  }

  async getCheckResultsSummary(): Promise<{
    totalChecks: number;
    successfulChecks: number;
    failedChecks: number;
    successRate: number;
    averageResponseTime: number;
  }> {
    return this.request<{
      totalChecks: number;
      successfulChecks: number;
      failedChecks: number;
      successRate: number;
      averageResponseTime: number;
    }>('/check-results/summary');
  }

  // Uptime
  async getUptimeStats(monitorId: string, params?: UptimeStatsQuery): Promise<UptimeStatsResponse> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && (value as any) !== '') {
          searchParams.set(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return this.request<UptimeStatsResponse>(
      `/uptime/monitor/${monitorId}${query ? `?${query}` : ''}`
    );
  }

  async getUptimeSummary(params?: UptimeStatsQuery): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && (value as any) !== '') {
          searchParams.set(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return this.request<any[]>(`/uptime/summary${query ? `?${query}` : ''}`);
  }

  async getDowntimeEvents(monitorId: string): Promise<DowntimeEventResponse[]> {
    return this.request<DowntimeEventResponse[]>(
      `/uptime/monitor/${monitorId}/downtime`
    );
  }

  // User
  async getProfile(): Promise<UserResponse> {
    return this.request<UserResponse>('/users/profile');
  }

  async updateProfile(data: { name?: string; email?: string }): Promise<UserResponse> {
    return this.request<UserResponse>('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return this.request('/users/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async deleteAccount(password: string): Promise<{ message: string }> {
    return this.request('/users/account', {
      method: 'DELETE',
      body: JSON.stringify({ password, confirm: 'DELETE' }),
    });
  }

  async getQuota(): Promise<{
    maxMonitors: number;
    usedMonitors: number;
    remainingMonitors: number;
    maxChecksPerMonth: number;
    minInterval: string;
    webhooksEnabled: boolean;
    apiAccess: boolean;
  }> {
    return this.request<{
      maxMonitors: number;
      usedMonitors: number;
      remainingMonitors: number;
      maxChecksPerMonth: number;
      minInterval: string;
      webhooksEnabled: boolean;
      apiAccess: boolean;
    }>('/users/quota');
  }

  // Health
  async healthCheck(): Promise<{
    status: string;
    version: string;
    uptime: number;
    checks: { database: string; redis?: string };
    timestamp: string;
  }> {
    return this.request<{
      status: string;
      version: string;
      uptime: number;
      checks: { database: string; redis?: string };
      timestamp: string;
    }>('/health');
  }
}

export const api = new ApiClient(API_URL);
