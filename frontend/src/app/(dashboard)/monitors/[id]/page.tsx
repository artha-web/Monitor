'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMonitor } from '@/hooks/useMonitor';
import { useCheckResults } from '@/hooks/useCheckResults';
import { useUptimeStats } from '@/hooks/useUptimeStats';
import { UptimePeriod, CheckResultStatus } from '@artha-monitor/shared';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { ResponseTimeChart } from '@/components/dashboard/ResponseTimeChart';
import { UptimeChart } from '@/components/dashboard/UptimeChart';
import { DeleteMonitorDialog } from '@/components/monitors/DeleteMonitorDialog';
import { MonitorFormModal } from '@/components/monitors/MonitorForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Activity,
  ArrowLeft,
  ExternalLink,
  Play,
  Pencil,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Sliders,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function MonitorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const monitorId = params['id'] as string;

  const [activeTab, setActiveTab] = React.useState('overview');
  const [selectedPeriod, setSelectedPeriod] = React.useState<UptimePeriod>('24h');
  const [checksPage, setChecksPage] = React.useState(1);
  const [checkStatusFilter, setCheckStatusFilter] = React.useState<string>('all');
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  // Monitor Query
  const {
    monitor,
    isLoading: isMonitorLoading,
    refetch: refetchMonitor,
    toggleMonitor,
    isToggling,
    triggerCheck,
    isTriggeringCheck,
    updateMonitorAsync,
    deleteMonitorAsync,
    isDeleting,
  } = useMonitor(monitorId, { pollingInterval: 15_000 });

  // Checks Query
  const {
    results: checkResults,
    meta: checkMeta,
    isLoading: isChecksLoading,
    refetch: refetchChecks,
  } = useCheckResults(
    monitorId,
    {
      page: checksPage,
      limit: 20,
      status: checkStatusFilter !== 'all' ? (checkStatusFilter as CheckResultStatus) : undefined,
    },
    { polling: true, pollingInterval: 15_000 }
  );

  // Uptime Stats Query
  const {
    stats: uptimeStats,
    downtimeEvents,
    isLoading: isUptimeLoading,
    refetch: refetchUptime,
  } = useUptimeStats(monitorId, selectedPeriod, { pollingInterval: 30_000 });

  if (isMonitorLoading && !monitor) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (!monitor) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
        <AlertTriangle className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-lg font-bold">Monitor not found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          The requested monitor does not exist or you don&apos;t have permission to access it.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/monitors">Back to Monitors</Link>
        </Button>
      </div>
    );
  }

  const latestCheck = checkResults[0];

  const handleManualCheck = () => {
    triggerCheck();
    setTimeout(() => {
      refetchChecks();
      refetchUptime();
    }, 1500);
  };

  const handleDeleteConfirm = async () => {
    await deleteMonitorAsync();
    router.push('/monitors');
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon" className="h-9 w-9 shrink-0">
            <Link href="/monitors">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate max-w-md">
                {monitor.name}
              </h1>
              <StatusBadge status={monitor.currentStatus} />
            </div>
            <a
              href={monitor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 truncate max-w-sm"
            >
              <span className="truncate">{monitor.url}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualCheck}
            disabled={isTriggeringCheck || !monitor.enabled}
            className="gap-1.5"
          >
            <Play className={`h-3.5 w-3.5 ${isTriggeringCheck ? 'animate-spin' : ''}`} />
            <span>Check Now</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
            className="gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit</span>
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Current Status</p>
            <div className="mt-2 flex items-center justify-between">
              <StatusBadge status={monitor.currentStatus} size="lg" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Active</span>
                <Switch
                  checked={monitor.enabled}
                  onCheckedChange={() => toggleMonitor()}
                  disabled={isToggling}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Uptime ({selectedPeriod})</p>
            <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
              {uptimeStats ? `${uptimeStats.uptimePercentage.toFixed(2)}%` : `${(monitor.uptimePercentage ?? 100).toFixed(2)}%`}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {uptimeStats?.failedChecks ? `${uptimeStats.failedChecks} failed checks` : 'No outages detected'}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Latest Latency</p>
            <h3 className="text-2xl font-bold mt-1 tracking-tight text-indigo-600 dark:text-indigo-400">
              {latestCheck ? `${latestCheck.responseTime} ms` : '—'}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {latestCheck?.statusCode ? `HTTP ${latestCheck.statusCode}` : 'Pending check'}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Cadence & Schedule</p>
            <h3 className="text-xl font-bold mt-1 tracking-tight">
              {monitor.interval} interval
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {monitor.activeWindowStart && monitor.activeWindowEnd
                ? `🕒 ${monitor.activeWindowStart} – ${monitor.activeWindowEnd} (${monitor.activeWindowTimezone || 'UTC'})`
                : `${monitor.timeout / 1000}s timeout • 24/7 monitoring`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 max-w-md">
          <TabsTrigger value="overview" className="gap-1.5 text-xs">
            <Activity className="h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="checks" className="gap-1.5 text-xs">
            <History className="h-3.5 w-3.5" />
            Checks
          </TabsTrigger>
          <TabsTrigger value="uptime" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" />
            Uptime
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 text-xs">
            <Sliders className="h-3.5 w-3.5" />
            Config
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Response Time History</CardTitle>
                <CardDescription className="text-xs">
                  Round-trip latency over the last 50 health probes (milliseconds)
                </CardDescription>
              </div>
              {uptimeStats && (
                <div className="text-xs font-medium text-muted-foreground text-right hidden sm:block">
                  Avg: <span className="font-semibold text-foreground">{uptimeStats.averageResponseTime}ms</span>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <ResponseTimeChart
                checks={checkResults}
                averageResponseTime={uptimeStats?.averageResponseTime}
              />
            </CardContent>
          </Card>

          {/* Recent Checks Snapshot */}
          <Card className="shadow-sm">
            <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Recent Health Checks</CardTitle>
                <CardDescription className="text-xs">
                  Probes dispatched in chronological sequence
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('checks')}
                className="text-xs text-primary"
              >
                View all checks →
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="w-[120px]">Result</TableHead>
                    <TableHead>Status Code</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Error Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkResults.slice(0, 8).map((result) => (
                    <TableRow key={result.id}>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                            result.status === 'success' ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {result.status === 'success' ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          <span className="capitalize">{result.status}</span>
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {result.statusCode ?? '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {result.responseTime} ms
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(parseISO(result.checkedAt))} ago
                      </TableCell>
                      <TableCell className="text-xs text-rose-600 max-w-xs truncate">
                        {result.errorMessage || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {checkResults.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-sm text-muted-foreground">
                        No check results logged yet. Click &quot;Check Now&quot; to probe immediately.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: CHECKS */}
        <TabsContent value="checks" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="p-5 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold">Check Results Log</CardTitle>
                <CardDescription className="text-xs">
                  Full paginated history with HTTP codes and latency breakdown
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Select value={checkStatusFilter} onValueChange={setCheckStatusFilter}>
                  <SelectTrigger className="w-36 h-8 text-xs">
                    <SelectValue placeholder="All results" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Results</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failure">Failure</SelectItem>
                    <SelectItem value="timeout">Timeout</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchChecks()}
                  className="h-8 gap-1.5"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Refresh</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead>HTTP Status</TableHead>
                    <TableHead>Latency</TableHead>
                    <TableHead>Checked At</TableHead>
                    <TableHead>Error Details / Response Snippet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkResults.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                            result.status === 'success'
                              ? 'text-emerald-600'
                              : result.status === 'timeout'
                              ? 'text-amber-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {result.status === 'success' ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          <span className="capitalize">{result.status}</span>
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {result.statusCode ?? '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {result.responseTime} ms
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(parseISO(result.checkedAt), 'MMM d, HH:mm:ss')}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-sm truncate">
                        {result.errorMessage ? (
                          <span className="text-rose-600 font-mono">{result.errorMessage}</span>
                        ) : result.responseBody ? (
                          <span className="font-mono">{result.responseBody}</span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {checkResults.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                        No checks match the current filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: UPTIME */}
        <TabsContent value="uptime" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">SLA & Uptime Reliability</h3>
            <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg">
              {(['24h', '7d', '30d', '90d', '365d'] as UptimePeriod[]).map((period) => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2.5 text-xs font-medium"
                  onClick={() => setSelectedPeriod(period)}
                >
                  {period}
                </Button>
              ))}
            </div>
          </div>

          <Card className="shadow-sm">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-base font-semibold">Availability Over Time</CardTitle>
              <CardDescription className="text-xs">
                Availability percentage across the selected timeframe ({selectedPeriod})
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <UptimeChart
                period={selectedPeriod}
                uptimePercentage={uptimeStats?.uptimePercentage ?? monitor.uptimePercentage}
              />
            </CardContent>
          </Card>

          {/* Downtime Incidents List */}
          <Card className="shadow-sm">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-base font-semibold">Downtime Incident Timeline</CardTitle>
              <CardDescription className="text-xs">
                Recorded outages and duration for this endpoint
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead>Started At</TableHead>
                    <TableHead>Resolved At</TableHead>
                    <TableHead>Total Duration</TableHead>
                    <TableHead>Root Cause / Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {downtimeEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="text-xs text-foreground font-medium">
                        {format(parseISO(event.startedAt), 'PPpp')}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {event.endedAt ? format(parseISO(event.endedAt), 'PPpp') : 'Ongoing'}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {event.duration ? `${Math.round(event.duration / 60)} minutes` : 'Ongoing'}
                      </TableCell>
                      <TableCell className="text-xs text-rose-600 font-mono">
                        {event.reason || 'Health probe failed / target unreachable'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {downtimeEvents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-sm text-muted-foreground">
                        No downtime events recorded during this period. 100% operational!
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: CONFIGURATION & SETTINGS */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Monitor Configuration</CardTitle>
              <CardDescription className="text-xs">
                Review or modify target endpoint settings and thresholds.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="rounded-lg border p-3 space-y-1">
                  <span className="text-muted-foreground">URL</span>
                  <p className="font-mono font-medium text-foreground">{monitor.url}</p>
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <span className="text-muted-foreground">Method</span>
                  <p className="font-mono font-medium text-foreground">{monitor.method}</p>
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <span className="text-muted-foreground">Check Cadence</span>
                  <p className="font-medium text-foreground">{monitor.interval}</p>
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <span className="text-muted-foreground">Timeout Threshold</span>
                  <p className="font-mono font-medium text-foreground">{monitor.timeout} ms</p>
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <span className="text-muted-foreground">Expected HTTP Codes</span>
                  <p className="font-mono font-medium text-foreground">
                    {monitor.expectedStatusCodes.join(', ')}
                  </p>
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <span className="text-muted-foreground">Response Substring Match</span>
                  <p className="font-mono font-medium text-foreground">
                    {monitor.expectedResponseText || 'None (Any valid status code)'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => setIsEditDialogOpen(true)} className="gap-2">
                  <Pencil className="h-4 w-4" />
                  <span>Edit Full Configuration</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/30 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-destructive">Danger Zone</CardTitle>
              <CardDescription className="text-xs">
                Permanent actions affecting this monitor and its history.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Delete this monitor</p>
                <p className="text-xs text-muted-foreground">
                  Permanently delete this monitor and wipe all associated check logs, metrics, and incident records.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="gap-2 shrink-0"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Monitor</span>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <MonitorFormModal
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        initialData={monitor}
        onSubmit={async (data) => {
          await updateMonitorAsync(data);
          refetchMonitor();
        }}
      />

      {/* Delete Confirmation */}
      <DeleteMonitorDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        monitorName={monitor.name}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
}
