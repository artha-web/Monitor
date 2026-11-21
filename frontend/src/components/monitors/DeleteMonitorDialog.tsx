'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface DeleteMonitorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monitorName: string;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function DeleteMonitorDialog({
  open,
  onOpenChange,
  monitorName,
  onConfirm,
  isDeleting,
}: DeleteMonitorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <DialogTitle className="text-xl">Delete Monitor</DialogTitle>
          <DialogDescription className="text-sm">
            Are you sure you want to delete <span className="font-semibold text-foreground">{monitorName}</span>?
            This will permanently remove the monitor along with all its recorded check results, downtime history, and performance metrics. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            loading={isDeleting}
            disabled={isDeleting}
          >
            Delete Monitor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
