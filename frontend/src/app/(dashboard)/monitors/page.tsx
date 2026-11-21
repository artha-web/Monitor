'use client';

import * as React from 'react';
import { useMonitors } from '@/hooks/useMonitors';
import { useCreateMonitor, useUpdateMonitor, useDeleteMonitor } from '@/hooks/useMonitorMutations';
import { MonitorResponse, CreateMonitorInput } from '@artha-monitor/shared';
import { MonitorTable } from '@/components/monitors/MonitorTable';
import { MonitorCard } from '@/components/monitors/MonitorCard';
import { MonitorFormModal } from '@/components/monitors/MonitorForm';
import { DeleteMonitorDialog } from '@/components/monitors/DeleteMonitorDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  LayoutGrid,
  List,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function MonitorsPage() {
  const [page, setPage] = React.useState(1);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [viewMode, setViewMode] = React.useState<'table' | 'grid'>('table');

  // Modal states
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingMonitor, setEditingMonitor] = React.useState<MonitorResponse | null>(null);
  const [deletingMonitor, setDeletingMonitor] = React.useState<MonitorResponse | null>(null);

  const {
    monitors,
    meta,
    isLoading,
    isFetching,
    refetch,
    toggleMonitor,
  } = useMonitors(
    { page, limit: 50 },
    { polling: true, pollingInterval: 30_000 }
  );

  const createMutation = useCreateMonitor();
  const deleteMutation = useDeleteMonitor();
  const { toast } = useToast();

  // Filter monitors client-side for rapid interactive search
  const filteredMonitors = React.useMemo(() => {
    return monitors.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.url.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'up') return m.currentStatus === 'up';
      if (statusFilter === 'down') return m.currentStatus === 'down';
      if (statusFilter === 'paused') return !m.enabled;
      return true;
    });
  }, [monitors, searchTerm, statusFilter]);

  // Aggregate stats
  const totalCount = monitors.length;
  const operationalCount = monitors.filter((m) => m.currentStatus === 'up').length;
  const downtimeCount = monitors.filter((m) => m.currentStatus === 'down').length;
  const averageUptime =
    totalCount > 0
      ? (
          monitors.reduce((acc, m) => acc + (m.uptimePercentage ?? 100), 0) /
          totalCount
        ).toFixed(2)
      : '100.00';

  const handleEdit = (monitor: MonitorResponse) => {
    setEditingMonitor(monitor);
    setIsFormOpen(true);
  };

  const handleDelete = (monitor: MonitorResponse) => {
    setDeletingMonitor(monitor);
  };

  const handleTriggerCheck = async (id: string) => {
    try {
      await api.triggerCheck(id);
      toast({
        title: 'Check initiated',
        description: 'Health probe has been dispatched.',
      });
      refetch();
    } catch (err: any) {
      toast({
        title: 'Check failed',
        description: err?.message || 'Failed to dispatch check',
        variant: 'destructive',
      });
    }
  };

  const handleFormSubmit = async (data: CreateMonitorInput) => {
    if (editingMonitor) {
      await api.updateMonitor(editingMonitor.id, data);
      toast({
        title: 'Monitor updated',
        description: `${data.name} was updated successfully.`,
      });
      refetch();
    } else {
      await createMutation.mutateAsync(data);
    }
    setIsFormOpen(false);
    setEditingMonitor(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingMonitor) return;
    await deleteMutation.mutateAsync(deletingMonitor.id);
    setDeletingMonitor(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Monitors</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time status, HTTP probes, and availability metrics for all configured targets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            onClick={() => {
              setEditingMonitor(null);
              setIsFormOpen(true);
            }}
            size="sm"
            className="gap-1.5 shadow-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>Add Monitor</span>
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Endpoints</p>
              <h3 className="text-2xl font-bold mt-1 tracking-tight">{totalCount}</h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Operational</p>
              <h3 className="text-2xl font-bold mt-1 tracking-tight text-emerald-600 dark:text-emerald-400">
                {operationalCount}
              </h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">In Downtime</p>
              <h3 className="text-2xl font-bold mt-1 tracking-tight text-rose-600 dark:text-rose-400">
                {downtimeCount}
              </h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Avg. Fleet Uptime</p>
              <h3 className="text-2xl font-bold mt-1 tracking-tight">
                {averageUptime}%
              </h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by name or URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="up">Operational</SelectItem>
              <SelectItem value="down">Downtime</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('table')}
            aria-label="Table view"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Monitors Display */}
      {viewMode === 'table' ? (
        <MonitorTable
          monitors={filteredMonitors}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggle={toggleMonitor}
          onTriggerCheck={handleTriggerCheck}
          onAddNew={() => {
            setEditingMonitor(null);
            setIsFormOpen(true);
          }}
          totalPages={meta?.pagination?.totalPages || 1}
          currentPage={page}
          onPageChange={setPage}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMonitors.map((m) => (
            <MonitorCard
              key={m.id}
              monitor={m}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={toggleMonitor}
              onTriggerCheck={handleTriggerCheck}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <MonitorFormModal
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingMonitor(null);
        }}
        initialData={editingMonitor}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteMonitorDialog
        open={!!deletingMonitor}
        onOpenChange={(open) => {
          if (!open) setDeletingMonitor(null);
        }}
        monitorName={deletingMonitor?.name || ''}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
