/**
 * Interval & Schedule utility functions for API
 * Re-exports core calculation utilities from shared package
 */

import {
  intervalToMs as sharedIntervalToMs,
  msToInterval as sharedMsToInterval,
  formatInterval as sharedFormatInterval,
  calculateNextCheckAt as sharedCalculateNextCheckAt,
  isWithinActiveWindow as sharedIsWithinActiveWindow,
  SUPPORTED_INTERVALS,
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

export const getSupportedIntervals = () => {
  return SUPPORTED_INTERVALS.map((item) => ({
    value: item.value,
    label: item.label,
    milliseconds: item.milliseconds,
  }));
};

export const parseInterval = (label: string): string => {
  const match = label.match(/(\d+)\s*(minute|min|m|second|sec|s|hour|hr|h|day|d)/i);
  if (match && match[1] && match[2]) {
    const num = parseInt(match[1], 10);
    const unit = match[2][0]?.toLowerCase() || 'm';
    return `${num}${unit}`;
  }
  return '1m';
};

export const calculateNextCheckAt = sharedCalculateNextCheckAt;
export const isWithinActiveWindow = sharedIsWithinActiveWindow;
