'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CreateMonitorInput, UpdateMonitorInput } from '@artha-monitor/shared';
import { useToast } from '@/hooks/use-toast';

export function useCreateMonitor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateMonitorInput) => api.createMonitor(data),
    onSuccess: (newMonitor) => {
      toast({
        title: 'Monitor created',
        description: `Successfully added ${newMonitor.name}. First health check will run shortly.`,
      });
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Creation failed',
        description: err?.message || 'Could not create monitor',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateMonitor(id: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: UpdateMonitorInput) => api.updateMonitor(id, data),
    onSuccess: (updated) => {
      toast({
        title: 'Monitor updated',
        description: `${updated.name} settings saved successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
      queryClient.invalidateQueries({ queryKey: ['monitor', id] });
    },
    onError: (err: any) => {
      toast({
        title: 'Update failed',
        description: err?.message || 'Could not update monitor',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteMonitor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => api.deleteMonitor(id),
    onSuccess: () => {
      toast({
        title: 'Monitor deleted',
        description: 'The monitor has been permanently removed.',
      });
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Delete failed',
        description: err?.message || 'Could not delete monitor',
        variant: 'destructive',
      });
    },
  });
}
