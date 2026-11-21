'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CreateMonitorInput,
  HttpMethod,
  MonitorInterval,
  SUPPORTED_INTERVALS,
  HTTP_METHODS,
  MonitorResponse,
} from '@artha-monitor/shared';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Terminal, Shield, Bell, Sliders, Clock } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  url: z.string().url('Must be a valid URL with http:// or https://'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
  interval: z.string().regex(/^\d+[smhd]$/i, 'Must be a valid interval format like 1m, 14m, 1h'),
  timeout: z.coerce.number().min(1000, 'Min 1s (1000ms)').max(60000, 'Max 60s (60000ms)'),
  expectedStatusCodes: z.string().min(1, 'At least one status code is required'),
  expectedResponseText: z.string().optional(),
  headersJson: z.string().optional(),
  body: z.string().optional(),
  emailEnabled: z.boolean().default(true),
  emailOnDown: z.boolean().default(true),
  emailOnUp: z.boolean().default(true),
  webhookUrl: z.string().url('Must be valid URL').optional().or(z.literal('')),
  webhookOnDown: z.boolean().default(false),
  webhookOnUp: z.boolean().default(false),
  enableActiveWindow: z.boolean().default(false),
  activeWindowStart: z.string().optional(),
  activeWindowEnd: z.string().optional(),
  activeWindowTimezone: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface MonitorFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: MonitorResponse | null;
  onSubmit: (data: CreateMonitorInput) => Promise<void>;
  isSubmitting?: boolean;
}

export function MonitorFormModal({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isSubmitting,
}: MonitorFormModalProps) {
  const isEditing = !!initialData;

  const defaultValues: Partial<FormData> = React.useMemo(() => {
    if (initialData) {
      return {
        name: initialData.name,
        url: initialData.url,
        method: initialData.method,
        interval: initialData.interval,
        timeout: initialData.timeout,
        expectedStatusCodes: initialData.expectedStatusCodes.join(', '),
        expectedResponseText: initialData.expectedResponseText || '',
        headersJson: initialData.headers ? JSON.stringify(initialData.headers, null, 2) : '',
        body: initialData.body || '',
        emailEnabled: initialData.notificationSettings?.emailEnabled ?? true,
        emailOnDown: initialData.notificationSettings?.emailOnDown ?? true,
        emailOnUp: initialData.notificationSettings?.emailOnUp ?? true,
        webhookUrl: initialData.notificationSettings?.webhookUrl || '',
        webhookOnDown: initialData.notificationSettings?.webhookOnDown ?? false,
        webhookOnUp: initialData.notificationSettings?.webhookOnUp ?? false,
        enableActiveWindow: !!(initialData.activeWindowStart && initialData.activeWindowEnd),
        activeWindowStart: initialData.activeWindowStart || '07:00',
        activeWindowEnd: initialData.activeWindowEnd || '12:00',
        activeWindowTimezone: initialData.activeWindowTimezone || (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'),
      };
    }
    return {
      name: '',
      url: 'https://',
      method: 'GET',
      interval: '3m',
      timeout: 10000,
      expectedStatusCodes: '200',
      expectedResponseText: '',
      headersJson: '',
      body: '',
      emailEnabled: true,
      emailOnDown: true,
      emailOnUp: true,
      webhookUrl: '',
      webhookOnDown: false,
      webhookOnUp: false,
      enableActiveWindow: false,
      activeWindowStart: '07:00',
      activeWindowEnd: '12:00',
      activeWindowTimezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
    };
  }, [initialData]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (open) {
      reset(defaultValues);
    }
  }, [open, defaultValues, reset]);

  const watchedMethod = watch('method');
  const watchedUrl = watch('url');
  const watchedHeaders = watch('headersJson');
  const watchedBody = watch('body');

  const curlPreview = React.useMemo(() => {
    let curl = `curl -X ${watchedMethod || 'GET'} "${watchedUrl || 'https://api.example.com'}"`;
    if (watchedHeaders) {
      try {
        const parsed = JSON.parse(watchedHeaders);
        for (const [k, v] of Object.entries(parsed)) {
          curl += ` \\\n  -H "${k}: ${v}"`;
        }
      } catch {
        // ignore parse error in preview
      }
    }
    if (watchedBody && watchedMethod !== 'GET' && watchedMethod !== 'HEAD') {
      curl += ` \\\n  -d '${watchedBody.replace(/'/g, "'\\''")}'`;
    }
    return curl;
  }, [watchedMethod, watchedUrl, watchedHeaders, watchedBody]);

  const handleFormSubmit = async (values: FormData) => {
    // Parse status codes
    const statusCodes = values.expectedStatusCodes
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 100 && n <= 599);

    // Parse headers JSON
    let parsedHeaders: Record<string, string> | undefined = undefined;
    if (values.headersJson && values.headersJson.trim()) {
      try {
        parsedHeaders = JSON.parse(values.headersJson);
      } catch {
        // Handled or ignored
      }
    }

    const payload: CreateMonitorInput = {
      name: values.name,
      url: values.url,
      method: values.method as HttpMethod,
      interval: values.interval as MonitorInterval,
      timeout: values.timeout,
      expectedStatusCodes: statusCodes.length > 0 ? statusCodes : [200],
      expectedResponseText: values.expectedResponseText?.trim() || undefined,
      headers: parsedHeaders,
      body: values.body?.trim() || undefined,
      notificationSettings: {
        emailEnabled: values.emailEnabled,
        emailOnDown: values.emailOnDown,
        emailOnUp: values.emailOnUp,
        webhookUrl: values.webhookUrl?.trim() || null,
        webhookOnDown: values.webhookOnDown,
        webhookOnUp: values.webhookOnUp,
      },
      activeWindowStart: values.enableActiveWindow && values.activeWindowStart ? values.activeWindowStart : null,
      activeWindowEnd: values.enableActiveWindow && values.activeWindowEnd ? values.activeWindowEnd : null,
      activeWindowTimezone: values.enableActiveWindow && values.activeWindowTimezone ? values.activeWindowTimezone : 'UTC',
    };

    await onSubmit(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEditing ? 'Edit Monitor' : 'Create New Monitor'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update endpoint configuration, interval cadence, and alert thresholds.'
              : 'Add an HTTP or REST API endpoint to automatically monitor its uptime and latency.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 pt-2">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general" className="gap-1.5 text-xs">
                <Sliders className="h-3.5 w-3.5" />
                General
              </TabsTrigger>
              <TabsTrigger value="request" className="gap-1.5 text-xs">
                <Terminal className="h-3.5 w-3.5" />
                HTTP & Headers
              </TabsTrigger>
              <TabsTrigger value="assertions" className="gap-1.5 text-xs">
                <Shield className="h-3.5 w-3.5" />
                Validation
              </TabsTrigger>
              <TabsTrigger value="alerts" className="gap-1.5 text-xs">
                <Bell className="h-3.5 w-3.5" />
                Alerts
              </TabsTrigger>
            </TabsList>

            {/* TAB: GENERAL */}
            <TabsContent value="general" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Friendly Monitor Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Production API Gateway, Auth Service"
                  {...register('name')}
                  error={!!errors.name}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">Target URL</Label>
                <Input
                  id="url"
                  placeholder="https://api.yourdomain.com/health"
                  {...register('url')}
                  error={!!errors.url}
                />
                {errors.url && (
                  <p className="text-xs text-destructive">{errors.url.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Check Interval</Label>
                  <Controller
                    control={control}
                    name="interval"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select interval" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORTED_INTERVALS.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label} ({item.value})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeout">Timeout (ms)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    placeholder="10000"
                    {...register('timeout')}
                    error={!!errors.timeout}
                  />
                  {errors.timeout && (
                    <p className="text-xs text-destructive">{errors.timeout.message}</p>
                  )}
                </div>
              </div>

              {/* Active Schedule Window */}
              <div className="rounded-lg border p-4 space-y-4 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-medium text-sm">
                      <Clock className="h-4 w-4 text-primary" />
                      Active Schedule Window
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Only ping this website during specific hours (e.g. 7:00 AM to 12:00 PM).
                    </p>
                  </div>
                  <Controller
                    control={control}
                    name="enableActiveWindow"
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>

                {watch('enableActiveWindow') && (
                  <div className="pt-2 border-t space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="activeWindowStart" className="text-xs font-semibold">Start Time (e.g. 07:00 AM)</Label>
                        <Input
                          id="activeWindowStart"
                          type="time"
                          {...register('activeWindowStart')}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="activeWindowEnd" className="text-xs font-semibold">End Time (e.g. 12:00 PM)</Label>
                        <Input
                          id="activeWindowEnd"
                          type="time"
                          {...register('activeWindowEnd')}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="activeWindowTimezone" className="text-xs font-semibold">Timezone</Label>
                      <Input
                        id="activeWindowTimezone"
                        placeholder="e.g. UTC, Asia/Kolkata, America/New_York"
                        {...register('activeWindowTimezone')}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground bg-primary/5 p-2 rounded border border-primary/10">
                      💡 Example: With interval of <strong>{watch('interval') || '14m'}</strong> and window <strong>{watch('activeWindowStart') || '07:00'} - {watch('activeWindowEnd') || '12:00'}</strong>, checks will execute every {watch('interval') || '14 minutes'} strictly between {watch('activeWindowStart') || '07:00'} and {watch('activeWindowEnd') || '12:00'} ({watch('activeWindowTimezone') || 'UTC'}). Outside this window, monitoring pauses and resumes automatically at {watch('activeWindowStart') || '07:00'}.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB: HTTP & HEADERS */}
            <TabsContent value="request" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>HTTP Method</Label>
                <Controller
                  control={control}
                  name="method"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        {HTTP_METHODS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="headersJson">Custom Headers (JSON Object)</Label>
                <Textarea
                  id="headersJson"
                  rows={3}
                  className="font-mono text-xs"
                  placeholder={'{\n  "Authorization": "Bearer secret-token",\n  "User-Agent": "ArthaMonitor/1.0"\n}'}
                  {...register('headersJson')}
                />
                <p className="text-[11px] text-muted-foreground">
                  Valid JSON key-value pairs to send with every probe.
                </p>
              </div>

              {watchedMethod !== 'GET' && watchedMethod !== 'HEAD' && (
                <div className="space-y-2">
                  <Label htmlFor="body">Request Body</Label>
                  <Textarea
                    id="body"
                    rows={4}
                    className="font-mono text-xs"
                    placeholder={'{\n  "status": "ping"\n}'}
                    {...register('body')}
                  />
                </div>
              )}

              {/* cURL Preview */}
              <div className="rounded-md border bg-muted/50 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Terminal className="h-3.5 w-3.5" />
                  Request Preview
                </div>
                <pre className="font-mono text-[11px] text-foreground overflow-x-auto whitespace-pre-wrap">
                  {curlPreview}
                </pre>
              </div>
            </TabsContent>

            {/* TAB: ASSERTIONS & VALIDATION */}
            <TabsContent value="assertions" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="expectedStatusCodes">Expected Status Codes</Label>
                <Input
                  id="expectedStatusCodes"
                  placeholder="200, 201, 204"
                  {...register('expectedStatusCodes')}
                  error={!!errors.expectedStatusCodes}
                />
                <p className="text-[11px] text-muted-foreground">
                  Comma-separated list of acceptable HTTP status codes (e.g. 200, 204, 301).
                </p>
                {errors.expectedStatusCodes && (
                  <p className="text-xs text-destructive">{errors.expectedStatusCodes.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectedResponseText">Expected Response Body Substring (Optional)</Label>
                <Input
                  id="expectedResponseText"
                  placeholder="e.g. status:ok or pong"
                  {...register('expectedResponseText')}
                />
                <p className="text-[11px] text-muted-foreground">
                  If provided, checks will fail if the response body does not contain this exact text.
                </p>
              </div>
            </TabsContent>

            {/* TAB: ALERTS */}
            <TabsContent value="alerts" className="space-y-4 pt-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold">Email Alerts</h4>
                    <p className="text-xs text-muted-foreground">
                      Send notification emails to your registered account address.
                    </p>
                  </div>
                  <Controller
                    control={control}
                    name="emailEnabled"
                    render={({ field }) => (
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t text-xs">
                  <div className="flex items-center justify-between">
                    <span>Alert on Down</span>
                    <Controller
                      control={control}
                      name="emailOnDown"
                      render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Alert on Recovery</span>
                    <Controller
                      control={control}
                      name="emailOnUp"
                      render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook Notification URL</Label>
                  <Input
                    id="webhookUrl"
                    placeholder="https://hooks.slack.com/services/..."
                    {...register('webhookUrl')}
                    error={!!errors.webhookUrl}
                  />
                  {errors.webhookUrl && (
                    <p className="text-xs text-destructive">{errors.webhookUrl.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t text-xs">
                  <div className="flex items-center justify-between">
                    <span>Webhook on Down</span>
                    <Controller
                      control={control}
                      name="webhookOnDown"
                      render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Webhook on Recovery</span>
                    <Controller
                      control={control}
                      name="webhookOnUp"
                      render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      )}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
              {isEditing ? 'Save Changes' : 'Create Monitor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
