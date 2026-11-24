'use client';

import * as React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface UptimeDataPoint {
  date: string;
  uptime: number;
}

interface UptimeChartProps {
  data?: UptimeDataPoint[];
  period?: string;
  uptimePercentage?: number;
  className?: string;
}

export function UptimeChart({
  data = [],
  period = '24h',
  uptimePercentage = 100,
  className,
}: UptimeChartProps) {
  const color = uptimePercentage >= 99 ? '#10b981' : uptimePercentage >= 95 ? '#f59e0b' : '#ef4444';

  // Show empty state when there is no real data yet
  if (data.length === 0) {
    return (
      <div className="flex h-[240px] flex-col items-center justify-center rounded-lg border border-dashed gap-2">
        <p className="text-sm font-medium text-muted-foreground">No uptime data yet</p>
        <p className="text-xs text-muted-foreground">
          Data will appear here after the first health probes complete.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="uptimeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickFormatter={(str) => {
                try {
                  const d = parseISO(str);
                  return period === '24h' ? format(d, 'HH:mm') : format(d, 'MMM d');
                } catch {
                  return '';
                }
              }}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis
              domain={[80, 100]}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              ticks={[80, 85, 90, 95, 100]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const p = payload[0];
                  let timeStr = '';
                  try {
                    timeStr = format(parseISO(p.payload.date), 'PPpp');
                  } catch {
                    timeStr = p.payload.date;
                  }
                  return (
                    <div className="rounded-lg border bg-popover p-2.5 shadow-md">
                      <p className="text-xs text-muted-foreground">{timeStr}</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">
                        Uptime: <span style={{ color }}>{Number(p.value).toFixed(2)}%</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="uptime"
              stroke={color}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#uptimeGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
