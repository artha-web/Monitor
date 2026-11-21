'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { UpdateMonitorInput } from '@artha-monitor/shared';
import { useToast } from '@/hooks/use-toast';

export function useMonitor(id: string, options?: { pollingInterval?: number; enabled?: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['monitor', id],
    queryFn: () => api.getMonitor(id),
    enabled: !!id && (options?.enabled ?? true),
    refetchInterval: options?.pollingInterval ?? 15_000,
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateMonitorInput) => api.updateMonitor(id, data),
    onSuccess: (updated) => {
      toast({
        title: 'Monitor updated',
        description: `${updated.name} has been updated successfully.`,
      });
      queryClient.setQueryData(['monitor', id], updated);
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Update failed',
        description: err?.message || 'Failed to update monitor configuration',
        variant: 'destructive',
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: () => api.toggleMonitor(id),
    onSuccess: (updated) => {
      toast({
        title: updated.enabled ? 'Monitor activated' : 'Monitor paused',
        description: `${updated.name} is now ${updated.enabled ? 'active' : 'paused'}.`,
      });
      queryClient.setQueryData(['monitor', id], updated);
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Toggle failed',
        description: err?.message || 'Failed to toggle monitor status',
        variant: 'destructive',
      });
    },
  });

  const triggerCheckMutation = useMutation({
    mutationFn: () => api.triggerCheck(id),
    onSuccess: (data) => {
      toast({
        title: 'Check triggered',
        description: data.message || 'Manual health check has been queued.',
      });
      queryClient.invalidateQueries({ queryKey: ['checkResults', id] });
      queryClient.invalidateQueries({ queryKey: ['monitor', id] });
      queryClient.invalidateQueries({ queryKey: ['uptimeStats', id] });
    },
    onError: (err: any) => {
      toast({
        title: 'Check failed',
        description: err?.message || 'Failed to trigger check',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteMonitor(id),
    onSuccess: () => {
      toast({
        title: 'Monitor deleted',
        description: 'The monitor has been permanently deleted.',
      });
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Delete failed',
        description: err?.message || 'Failed to delete monitor',
        variant: 'destructive',
      });
    },
  });

  return {
    ...query,
    monitor: query.data,
    updateMonitor: updateMutation.mutate,
    updateMonitorAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    toggleMonitor: toggleMutation.mutate,
    isToggling: toggleMutation.isPending,
    triggerCheck: triggerCheckMutation.mutate,
    isTriggeringCheck: triggerCheckMutation.isPending,
    deleteMonitor: deleteMutation.mutate,
    deleteMonitorAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
