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
  ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { CheckResultResponse } from '@artha-monitor/shared';

interface ResponseTimeChartProps {
  checks: CheckResultResponse[];
  averageResponseTime?: number;
  className?: string;
}

export function ResponseTimeChart({
  checks = [],
  averageResponseTime,
  className,
}: ResponseTimeChartProps) {
  // Sort checks chronologically for charting
  const chartData = React.useMemo(() => {
    return [...checks]
      .reverse()
      .slice(-50)
      .map((c) => ({
        id: c.id,
        checkedAt: c.checkedAt,
        responseTime: c.responseTime,
        statusCode: c.statusCode,
        status: c.status,
      }));
  }, [checks]);

  const avg = React.useMemo(() => {
    if (averageResponseTime !== undefined) return averageResponseTime;
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, c) => acc + c.responseTime, 0);
    return Math.round(sum / chartData.length);
  }, [chartData, averageResponseTime]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No latency data recorded yet
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis
              dataKey="checkedAt"
              tickLine={false}
              axisLine={false}
              tickFormatter={(str) => {
                try {
                  return format(parseISO(str), 'HH:mm:ss');
                } catch {
                  return '';
                }
              }}
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}ms`}
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
            />
            {avg > 0 && (
              <ReferenceLine
                y={avg}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{
                  value: `Avg ${avg}ms`,
                  position: 'right',
                  fill: '#94a3b8',
                  fontSize: 10,
                }}
              />
            )}
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  let timeStr = '';
                  try {
                    timeStr = format(parseISO(data.checkedAt), 'PPpp');
                  } catch {
                    timeStr = data.checkedAt;
                  }
                  return (
                    <div className="rounded-lg border bg-popover p-2.5 shadow-md text-xs">
                      <p className="text-muted-foreground">{timeStr}</p>
                      <div className="mt-1.5 flex items-center justify-between gap-3 font-medium">
                        <span className="text-foreground">Latency:</span>
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          {data.responseTime} ms
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3 text-muted-foreground">
                        <span>Status Code:</span>
                        <span
                          className={
                            data.statusCode && data.statusCode >= 200 && data.statusCode < 300
                              ? 'text-emerald-600 font-medium'
                              : 'text-rose-600 font-medium'
                          }
                        >
                          {data.statusCode ?? 'N/A'}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="responseTime"
              stroke="#6366f1"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#latencyGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
