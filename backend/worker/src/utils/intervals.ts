/**
 * Interval & Schedule utility functions for worker
 * Re-exports core calculation utilities from shared package
 */

import {
  intervalToMs as sharedIntervalToMs,
  msToInterval as sharedMsToInterval,
  formatInterval as sharedFormatInterval,
  calculateNextCheckAt as sharedCalculateNextCheckAt,
  isWithinActiveWindow as sharedIsWithinActiveWindow,
} from '@artha-monitor/shared';

export type MonitorInterval = string;

export const intervalToMs = (interval: string): number => {
  return sharedIntervalToMs(interval);
};

export const msToInterval = (ms: number): string => {
  return sharedMsToInterval(ms);
};

export const formatInterval = (interval: string): string => {
  return sharedFormatInterval(interval);
};

export const calculateNextCheckAt = sharedCalculateNextCheckAt;
export const isWithinActiveWindow = sharedIsWithinActiveWindow;
