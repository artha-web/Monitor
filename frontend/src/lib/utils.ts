import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatInterval(interval: string): string {
  const num = parseInt(interval.replace('m', ''), 10);
  return num === 1 ? '1 minute' : `${num} minutes`;
}

export function formatUptime(percentage: number): string {
  if (percentage === 100) return '100%';
  return percentage.toFixed(2) + '%';
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'up':
      return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
    case 'down':
      return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
    case 'pending':
      return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
    case 'unknown':
      return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
    case 'maintenance':
      return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30';
    default:
      return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
  }
}

export function getCheckStatusColor(status: string): string {
  switch (status) {
    case 'success':
      return 'text-green-600 dark:text-green-400';
    case 'failure':
      return 'text-red-600 dark:text-red-400';
    case 'timeout':
      return 'text-orange-600 dark:text-orange-400';
    case 'error':
      return 'text-purple-600 dark:text-purple-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

export function formatResponseTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function calculateUptimePercentage(successful: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((successful / total) * 10000) / 100;
}

export const SUPPORTED_INTERVALS = [
  { value: '1m', label: '1 minute' },
  { value: '2m', label: '2 minutes' },
  { value: '3m', label: '3 minutes' },
  { value: '5m', label: '5 minutes' },
  { value: '10m', label: '10 minutes' },
  { value: '13m', label: '13 minutes' },
  { value: '15m', label: '15 minutes' },
  { value: '20m', label: '20 minutes' },
  { value: '30m', label: '30 minutes' },
] as const;

export const HTTP_METHODS = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'HEAD', label: 'HEAD' },
  { value: 'OPTIONS', label: 'OPTIONS' },
] as const;