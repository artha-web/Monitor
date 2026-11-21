'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { UptimePeriod } from '@artha-monitor/shared';

export function useUptimeStats(
  monitorId: string,
  period: UptimePeriod = '24h',
  options?: { pollingInterval?: number }
) {
  const query = useQuery({
    queryKey: ['uptimeStats', monitorId, period],
    queryFn: () => api.getUptimeStats(monitorId, { period }),
    enabled: !!monitorId,
    refetchInterval: options?.pollingInterval ?? 30_000,
    staleTime: 15_000,
  });

  const downtimeQuery = useQuery({
    queryKey: ['downtimeEvents', monitorId],
    queryFn: () => api.getDowntimeEvents(monitorId),
    enabled: !!monitorId,
    staleTime: 15_000,
  });

  return {
    stats: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    downtimeEvents: downtimeQuery.data ?? [],
    isDowntimeLoading: downtimeQuery.isLoading,
  };
}
