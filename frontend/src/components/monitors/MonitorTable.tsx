'use client';

import * as React from 'react';
import { MonitorResponse } from '@artha-monitor/shared';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MonitorRow } from '@/components/monitors/MonitorRow';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Activity, Plus, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface MonitorTableProps {
  monitors: MonitorResponse[];
  isLoading?: boolean;
  onEdit: (monitor: MonitorResponse) => void;
  onDelete: (monitor: MonitorResponse) => void;
  onToggle: (id: string) => void;
  onTriggerCheck?: (id: string) => void;
  onAddNew: () => void;
  totalPages?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

export function MonitorTable({
  monitors,
  isLoading,
  onEdit,
  onDelete,
  onToggle,
  onTriggerCheck,
  onAddNew,
  totalPages = 1,
  currentPage = 1,
  onPageChange,
}: MonitorTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-20 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (monitors.length === 0) {
    return (
      <div className="flex min-h-[380px] flex-col items-center justify-center rounded-xl border border-dashed bg-card/60 p-8 text-center animate-in fade-in-50">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
          <Activity className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold text-foreground">No monitors found</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          You haven&apos;t added any endpoints matching this filter yet. Add your first service to begin monitoring its uptime and response latency.
        </p>
        <Button onClick={onAddNew} className="mt-6 gap-2 shadow-sm font-semibold">
          <Plus className="h-4 w-4" />
          <span>Add Your First Monitor</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[140px]">Status</TableHead>
              <TableHead>Monitor / URL</TableHead>
              <TableHead>Protocol & Cadence</TableHead>
              <TableHead>Uptime</TableHead>
              <TableHead>Last Check</TableHead>
              <TableHead>Next Check</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monitors.map((monitor) => (
              <MonitorRow
                key={monitor.id}
                monitor={monitor}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggle={onToggle}
                onTriggerCheck={onTriggerCheck}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between px-2 pt-2 text-xs text-muted-foreground">
          <span>
            Showing page {currentPage} of {totalPages}
          </span>
          <Pagination className="justify-end w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNumber = idx + 1;
                return (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      isActive={pageNumber === currentPage}
                      onClick={() => onPageChange(pageNumber)}
                      className="cursor-pointer"
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
