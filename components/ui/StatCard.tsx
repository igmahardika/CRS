import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  subtext?: string;
  badge?: React.ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  subtext,
  badge,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col justify-between p-4 sm:p-5 rounded-xl border border-slate-200 bg-white shadow-sm transition-colors',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-sans font-medium text-slate-500 leading-none truncate">
          {label}
        </span>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon className="h-4 w-4 stroke-[1.75]" />
        </div>
      </div>
      <div className="mt-2.5 flex items-baseline justify-between gap-2">
        <span className="text-xl font-heading font-semibold text-slate-900 leading-none tabular-nums tracking-tight">
          {value}
        </span>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
      {subtext && (
        <span className="mt-2 text-xs font-sans text-slate-500 leading-none">
          {subtext}
        </span>
      )}
    </div>
  );
}
