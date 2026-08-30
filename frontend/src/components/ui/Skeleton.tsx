import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted/15 ${className}`}
      {...props}
    />
  );
}

export function TableSkeleton({
  rows = 5,
  cols = 5,
  className = "",
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div className={`w-full bg-card border border-border-custom rounded-lg overflow-hidden ${className}`}>
      <div className="p-4 border-b border-border-custom bg-elevated/40 flex items-center justify-between">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="p-4 space-y-3">
        {/* Table Header */}
        <div className="flex gap-4 pb-2 border-b border-border-custom/40">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={`th-${i}`} className="h-3 flex-1" />
          ))}
        </div>
        {/* Table Rows */}
        {Array.from({ length: rows }).map((_, r) => (
          <div key={`tr-${r}`} className="flex gap-4 py-2 border-b border-border-custom/20 last:border-0">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={`td-${r}-${c}`} className="h-3.5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`p-4 bg-card border border-border-custom rounded-lg space-y-3 ${className}`}>
      <div className="flex justify-between items-center">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-2.5 w-20" />
    </div>
  );
}

export function FormSkeleton({ fields = 4, className = "" }: { fields?: number; className?: string }) {
  return (
    <div className={`bg-card border border-border-custom rounded-lg p-6 space-y-4 ${className}`}>
      <Skeleton className="h-5 w-40 mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-border-custom">
        <Skeleton className="h-9 w-20 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="p-6 space-y-6 w-full animate-fade-in">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* Main Table Content */}
      <TableSkeleton rows={6} cols={5} />
    </div>
  );
}

export default Skeleton;
