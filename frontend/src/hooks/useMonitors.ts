'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, MonitorListResponse } from '@/lib/api';
import { PaginationQuery, MonitorResponse } from '@artha-monitor/shared';
import { useToast } from '@/hooks/use-toast';

export function useMonitors(
  params?: PaginationQuery,
  options?: { polling?: boolean; pollingInterval?: number }
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['monitors', params],
    queryFn: () => api.getMonitors(params),
    refetchInterval: options?.polling ? (options.pollingInterval ?? 30_000) : false,
    staleTime: 10_000,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.toggleMonitor(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['monitors'] });
      const previousData = queryClient.getQueryData<MonitorListResponse>(['monitors', params]);

      if (previousData) {
        queryClient.setQueryData<MonitorListResponse>(['monitors', params], {
          ...previousData,
          monitors: previousData.monitors.map((m) =>
            m.id === id ? { ...m, enabled: !m.enabled } : m
          ),
        });
      }

      return { previousData };
    },
    onError: (err: any, id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['monitors', params], context.previousData);
      }
      toast({
        title: 'Error toggling monitor',
        description: err?.message || 'Failed to toggle monitor status',
        variant: 'destructive',
      });
    },
    onSuccess: (updatedMonitor) => {
      toast({
        title: updatedMonitor.enabled ? 'Monitor enabled' : 'Monitor disabled',
        description: `${updatedMonitor.name} is now ${updatedMonitor.enabled ? 'active' : 'paused'}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
      queryClient.invalidateQueries({ queryKey: ['monitor', updatedMonitor.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteMonitor(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['monitors'] });
      const previousData = queryClient.getQueryData<MonitorListResponse>(['monitors', params]);

      if (previousData) {
        queryClient.setQueryData<MonitorListResponse>(['monitors', params], {
          ...previousData,
          monitors: previousData.monitors.filter((m) => m.id !== id),
        });
      }

      return { previousData };
    },
    onError: (err: any, id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['monitors', params], context.previousData);
      }
      toast({
        title: 'Error deleting monitor',
        description: err?.message || 'Failed to delete monitor',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Monitor deleted',
        description: 'The monitor has been successfully removed.',
      });
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
    },
  });

  return {
    ...query,
    monitors: query.data?.monitors ?? [],
    meta: query.data?.meta,
    toggleMonitor: toggleMutation.mutate,
    isToggling: toggleMutation.isPending,
    deleteMonitor: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
