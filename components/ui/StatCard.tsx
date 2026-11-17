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
        'flex flex-col justify-between p-4 sm:p-4.5 rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] hover:border-slate-300/90 transition-all duration-150',
        className
      )}
    >
      {/* Top Header: Technical Eyebrow & Subtle Direct Icon */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider leading-none truncate">
          {label}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {badge}
          <Icon className="h-4 w-4 text-slate-500 stroke-[1.75]" />
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="text-2xl font-sans font-bold text-slate-900 leading-none tabular-nums tracking-tight">
          {value}
        </span>
      </div>

      {/* Metric Context & Threshold Metadata */}
      {subtext && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center text-[12px] font-sans text-slate-500 leading-tight">
          <span className="truncate">{subtext}</span>
        </div>
      )}
    </div>
  );
}
