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
        'flex flex-col justify-between p-5 rounded-lg border border-slate-200 bg-white shadow-sm transition-colors',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-sans font-medium text-slate-500 leading-none truncate">
          {label}
        </span>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon className="h-5 w-5 stroke-[1.75]" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="text-[24px] font-heading font-semibold text-slate-900 leading-none tabular-nums tracking-tight">
          {value}
        </span>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
      {subtext && (
        <span className="mt-2 text-[12px] font-sans text-slate-500 leading-none">
          {subtext}
        </span>
      )}
    </div>
  );
}
