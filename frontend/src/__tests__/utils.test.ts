import { describe, it, expect } from 'vitest';
import {
  cn,
  formatInterval,
  formatUptime,
  getStatusColor,
  getCheckStatusColor,
  formatResponseTime,
} from '../lib/utils';

describe('Frontend UI Utilities', () => {
  it('merges tailwind classes cleanly with cn()', () => {
    expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
    expect(cn('p-4', 'p-2')).toBe('p-2'); // Tailwind merge overrides
  });

  it('formats intervals into natural strings', () => {
    expect(formatInterval('1m')).toBe('1 minute');
    expect(formatInterval('5m')).toBe('5 minutes');
    expect(formatInterval('15m')).toBe('15 minutes');
  });

  it('formats uptime percentages cleanly', () => {
    expect(formatUptime(100)).toBe('100%');
    expect(formatUptime(99.987)).toBe('99.99%');
    expect(formatUptime(95.5)).toBe('95.50%');
  });

  it('provides matching status color classes', () => {
    expect(getStatusColor('up')).toContain('text-green-600');
    expect(getStatusColor('down')).toContain('text-red-600');
    expect(getCheckStatusColor('success')).toContain('text-green-600');
    expect(getCheckStatusColor('failure')).toContain('text-red-600');
  });

  it('formats response times with appropriate units', () => {
    expect(formatResponseTime(45)).toBe('45ms');
    expect(formatResponseTime(1500)).toBe('1.50s');
  });
});
