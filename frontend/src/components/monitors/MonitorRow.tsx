'use client';

import * as React from 'react';
import Link from 'next/link';
import { MonitorResponse } from '@artha-monitor/shared';
import { TableRow, TableCell } from '@/components/ui/table';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  ExternalLink,
  Play,
  Pencil,
  Trash2,
  Activity,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface MonitorRowProps {
  monitor: MonitorResponse;
  onEdit: (monitor: MonitorResponse) => void;
  onDelete: (monitor: MonitorResponse) => void;
  onToggle: (id: string) => void;
  onTriggerCheck?: (id: string) => void;
}

export function MonitorRow({
  monitor,
  onEdit,
  onDelete,
  onToggle,
  onTriggerCheck,
}: MonitorRowProps) {
  const lastCheckText = React.useMemo(() => {
    if (!monitor.lastCheckAt) return 'Never checked';
    try {
      return `${formatDistanceToNow(parseISO(monitor.lastCheckAt))} ago`;
    } catch {
      return 'Recent';
    }
  }, [monitor.lastCheckAt]);

  const nextCheckText = React.useMemo(() => {
    if (!monitor.enabled) return 'Paused';
    if (!monitor.nextCheckAt) return 'Queued';
    try {
      const nextDate = parseISO(monitor.nextCheckAt);
      if (nextDate.getTime() < Date.now()) return 'In queue';
      return `in ${formatDistanceToNow(nextDate)}`;
    } catch {
      return 'Pending';
    }
  }, [monitor.nextCheckAt, monitor.enabled]);

  const uptime = typeof monitor.uptimePercentage === 'number' ? monitor.uptimePercentage : 100;
  const uptimeColor =
    uptime >= 99
      ? 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
      : uptime >= 95
      ? 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
      : 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800';

  return (
    <TableRow className="group transition-colors hover:bg-muted/40">
      <TableCell className="w-[140px]">
        <StatusBadge status={monitor.currentStatus} />
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <Link
            href={`/monitors/${monitor.id}`}
            className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
          >
            {monitor.name}
          </Link>
          <a
            href={monitor.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 w-fit mt-0.5 truncate max-w-xs md:max-w-sm"
          >
            <span>{monitor.url}</span>
            <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
          </a>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1 items-start">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="font-mono text-xs">
              {monitor.method}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {monitor.interval}
            </Badge>
          </div>
          {monitor.activeWindowStart && monitor.activeWindowEnd && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
              <Clock className="h-2.5 w-2.5 text-primary" />
              {monitor.activeWindowStart}-{monitor.activeWindowEnd}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${uptimeColor}`}
        >
          {uptime.toFixed(2)}%
        </span>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 opacity-60" />
          <span>{lastCheckText}</span>
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <span>{nextCheckText}</span>
      </TableCell>
      <TableCell>
        <Switch
          checked={monitor.enabled}
          onCheckedChange={() => onToggle(monitor.id)}
          aria-label="Toggle monitor status"
        />
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild>
              <Link href={`/monitors/${monitor.id}`} className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span>View Details</span>
              </Link>
            </DropdownMenuItem>
            {onTriggerCheck && (
              <DropdownMenuItem
                onClick={() => onTriggerCheck(monitor.id)}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4 text-muted-foreground" />
                <span>Check Now</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => onEdit(monitor)}
              className="flex items-center gap-2"
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
              <span>Edit Monitor</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(monitor)}
              className="flex items-center gap-2 text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
