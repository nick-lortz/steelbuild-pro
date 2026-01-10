import React from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('animate-pulse bg-zinc-800 rounded', className)}
      {...props}
    />
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-4 w-full" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    </div>
  );
}

export function DataTableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <div className="bg-zinc-800/80 p-3 grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4" />
        ))}
      </div>
      <div className="divide-y divide-zinc-800">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-3 grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton key={j} className="h-4" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function KPICardSkeleton() {
  return (
    <div className="border-l-4 border-zinc-800 bg-zinc-950 pl-5 pr-4 py-5">
      <Skeleton className="h-12 w-24 mb-2" />
      <Skeleton className="h-3 w-32 mb-3" />
      <Skeleton className="h-1 w-full" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-black">
      <div className="border-b border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-2">
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      <div className="border-b-2 border-zinc-800 bg-black">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="grid grid-cols-4 gap-6">
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-4 gap-0 border border-zinc-800">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 border-r border-zinc-800 last:border-r-0">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <DataTableSkeleton rows={8} columns={3} />
          <DataTableSkeleton rows={8} columns={3} />
        </div>
      </div>
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-64" />
      </div>
      
      <Skeleton className="h-12 w-full" />
      
      <div className="grid grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded p-4">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
      
      <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}