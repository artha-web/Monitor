'use client';

import * as React from 'react';
import Link from 'next/link';
import { MonitorResponse } from '@artha-monitor/shared';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  Clock,
  ArrowRight,
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface MonitorCardProps {
  monitor: MonitorResponse;
  onEdit: (monitor: MonitorResponse) => void;
  onDelete: (monitor: MonitorResponse) => void;
  onToggle: (id: string) => void;
  onTriggerCheck?: (id: string) => void;
}

export function MonitorCard({
  monitor,
  onEdit,
  onDelete,
  onToggle,
  onTriggerCheck,
}: MonitorCardProps) {
  const lastCheckText = React.useMemo(() => {
    if (!monitor.lastCheckAt) return 'Never checked';
    try {
      return `${formatDistanceToNow(parseISO(monitor.lastCheckAt))} ago`;
    } catch {
      return 'Recent';
    }
  }, [monitor.lastCheckAt]);

  const uptime = typeof monitor.uptimePercentage === 'number' ? monitor.uptimePercentage : 100;
  const uptimeColor =
    uptime >= 99
      ? 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
      : uptime >= 95
      ? 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
      : 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800';

  return (
    <Card className="transition-all duration-200 hover:shadow-md hover:border-foreground/20">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <StatusBadge status={monitor.currentStatus} size="sm" />
              <Badge variant="outline" className="font-mono text-[10px] uppercase">
                {monitor.method}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {monitor.interval}
              </Badge>
              {monitor.activeWindowStart && monitor.activeWindowEnd && (
                <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {monitor.activeWindowStart} - {monitor.activeWindowEnd}
                </Badge>
              )}
            </div>
            <Link
              href={`/monitors/${monitor.id}`}
              className="font-semibold text-foreground hover:text-primary transition-colors text-base block truncate mt-1"
            >
              {monitor.name}
            </Link>
            <a
              href={monitor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 truncate w-fit"
            >
              <span className="truncate">{monitor.url}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem asChild>
                <Link href={`/monitors/${monitor.id}`} className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
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
                className="flex items-center gap-2 text-rose-600 focus:text-rose-600"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-2">
        <div className="flex items-center justify-between border-t pt-3 mt-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{lastCheckText}</span>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded font-semibold border ${uptimeColor}`}
            >
              {uptime.toFixed(2)}%
            </span>
            <Switch
              checked={monitor.enabled}
              onCheckedChange={() => onToggle(monitor.id)}
              aria-label="Toggle monitor status"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
