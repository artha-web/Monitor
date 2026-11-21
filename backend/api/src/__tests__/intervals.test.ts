import { describe, it, expect } from 'vitest';
import {
  intervalToMs,
  msToInterval,
  formatInterval,
  parseInterval,
  getSupportedIntervals,
  calculateNextCheckAt,
  isWithinActiveWindow,
} from '../utils/intervals';

describe('Interval & Schedule Utilities', () => {
  it('converts interval codes to exact milliseconds including 14m', () => {
    expect(intervalToMs('1m')).toBe(60_000);
    expect(intervalToMs('2m')).toBe(120_000);
    expect(intervalToMs('14m')).toBe(840_000); // 14 minutes = 14 * 60,000
    expect(intervalToMs('30m')).toBe(1_800_000);
    expect(intervalToMs('1h')).toBe(3_600_000);
  });

  it('converts milliseconds back to standard interval codes', () => {
    expect(msToInterval(60_000)).toBe('1m');
    expect(msToInterval(840_000)).toBe('14m');
    expect(msToInterval(300_000)).toBe('5m');
    expect(msToInterval(1_800_000)).toBe('30m');
  });

  it('formats interval strings for user-friendly UI display', () => {
    expect(formatInterval('1m')).toBe('1 minute');
    expect(formatInterval('14m')).toBe('14 minutes');
    expect(formatInterval('1h')).toBe('1 hour');
  });

  it('parses natural language interval strings', () => {
    expect(parseInterval('1 minute')).toBe('1m');
    expect(parseInterval('14 minutes')).toBe('14m');
    expect(parseInterval('10 minutes')).toBe('10m');
  });

  it('returns all supported intervals with labels and ms values', () => {
    const list = getSupportedIntervals();
    expect(list.some((item) => item.value === '14m')).toBe(true);
    expect(list.find((item) => item.value === '14m')?.milliseconds).toBe(840_000);
  });

  describe('Active Time Window (Schedule)', () => {
    it('accurately identifies whether a time is within the active window', () => {
      // 09:30 UTC is inside 07:00 to 12:00
      const insideDate = new Date('2026-11-20T09:30:00Z');
      expect(
        isWithinActiveWindow({
          activeWindowStart: '07:00',
          activeWindowEnd: '12:00',
          timezone: 'UTC',
          date: insideDate,
        })
      ).toBe(true);

      // 14:00 UTC is outside 07:00 to 12:00
      const outsideDate = new Date('2026-11-20T14:00:00Z');
      expect(
        isWithinActiveWindow({
          activeWindowStart: '07:00',
          activeWindowEnd: '12:00',
          timezone: 'UTC',
          date: outsideDate,
        })
      ).toBe(false);
    });

    it('calculates candidate within active window normally (every 14m between 07:00 and 12:00)', () => {
      const from = new Date('2026-11-20T08:00:00Z');
      const next = calculateNextCheckAt({
        interval: '14m',
        activeWindowStart: '07:00',
        activeWindowEnd: '12:00',
        timezone: 'UTC',
        fromDate: from,
      });

      // 8:00 + 14m = 8:14 UTC (still inside 07:00 - 12:00)
      expect(next.toISOString()).toBe('2026-11-20T08:14:00.000Z');
    });

    it('advances next check to 07:00 tomorrow when window has closed for the day', () => {
      const from = new Date('2026-11-20T11:55:00Z');
      // 11:55 + 14m = 12:09 UTC, which is AFTER 12:00 PM
      const next = calculateNextCheckAt({
        interval: '14m',
        activeWindowStart: '07:00',
        activeWindowEnd: '12:00',
        timezone: 'UTC',
        fromDate: from,
      });

      // Next check must resume at 07:00 UTC on the next day (2026-11-21)
      expect(next.toISOString()).toBe('2026-11-21T07:00:00.000Z');
    });

    it('advances next check to 07:00 today when candidate is before the window opens', () => {
      const from = new Date('2026-11-20T05:00:00Z');
      // 05:00 + 14m = 05:14 UTC, which is BEFORE 07:00 AM
      const next = calculateNextCheckAt({
        interval: '14m',
        activeWindowStart: '07:00',
        activeWindowEnd: '12:00',
        timezone: 'UTC',
        fromDate: from,
      });

      // Next check must start at 07:00 UTC today
      expect(next.toISOString()).toBe('2026-11-20T07:00:00.000Z');
    });
  });
});
