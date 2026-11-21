'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CheckResultsQuery } from '@artha-monitor/shared';

export function useCheckResults(
  monitorId: string,
  params?: CheckResultsQuery,
  options?: { polling?: boolean; pollingInterval?: number }
) {
  const query = useQuery({
    queryKey: ['checkResults', monitorId, params],
    queryFn: () => api.getCheckResults(monitorId, params),
    enabled: !!monitorId,
    refetchInterval: options?.polling ? (options.pollingInterval ?? 15_000) : false,
    staleTime: 5_000,
  });

  return {
    ...query,
    results: query.data?.results ?? [],
    meta: query.data?.meta,
  };
}
