import * as React from 'react';
import { cn } from '@/lib/utils';
import { MonitorStatus } from '@artha-monitor/shared';

interface StatusBadgeProps {
  status: MonitorStatus;
  size?: 'sm' | 'default' | 'lg';
  showPulse?: boolean;
  className?: string;
}

const statusConfig: Record<
  MonitorStatus,
  { label: string; bg: string; text: string; dotBg: string; pulseBg: string; border: string }
> = {
  up: {
    label: 'Operational',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-700 dark:text-emerald-400',
    dotBg: 'bg-emerald-500',
    pulseBg: 'bg-emerald-400',
    border: 'border-emerald-500/20',
  },
  down: {
    label: 'Downtime',
    bg: 'bg-rose-500/10',
    text: 'text-rose-700 dark:text-rose-400',
    dotBg: 'bg-rose-500',
    pulseBg: 'bg-rose-400',
    border: 'border-rose-500/20',
  },
  pending: {
    label: 'Pending',
    bg: 'bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-400',
    dotBg: 'bg-amber-500',
    pulseBg: 'bg-amber-400',
    border: 'border-amber-500/20',
  },
  maintenance: {
    label: 'Maintenance',
    bg: 'bg-sky-500/10',
    text: 'text-sky-700 dark:text-sky-400',
    dotBg: 'bg-sky-500',
    pulseBg: 'bg-sky-400',
    border: 'border-sky-500/20',
  },
  unknown: {
    label: 'Unknown',
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-700 dark:text-zinc-400',
    dotBg: 'bg-zinc-500',
    pulseBg: 'bg-zinc-400',
    border: 'border-zinc-500/20',
  },
};

export function StatusBadge({
  status,
  size = 'default',
  showPulse = true,
  className,
}: StatusBadgeProps) {
  const cfg = statusConfig[status] || statusConfig.unknown;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    default: 'text-xs px-2.5 py-1 gap-2',
    lg: 'text-sm px-3.5 py-1.5 gap-2.5',
  }[size];

  const dotSizes = {
    sm: 'h-1.5 w-1.5',
    default: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
  }[size];

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border shadow-sm transition-colors',
        cfg.bg,
        cfg.text,
        cfg.border,
        sizeClasses,
        className
      )}
    >
      <span className="relative flex">
        {showPulse && (status === 'up' || status === 'down') && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              cfg.pulseBg
            )}
          />
        )}
        <span className={cn('relative inline-flex rounded-full', cfg.dotBg, dotSizes)} />
      </span>
      <span>{cfg.label}</span>
    </span>
  );
}
