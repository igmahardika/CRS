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
  onClick?: () => void;
  active?: boolean;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  subtext,
  badge,
  className,
  onClick,
  active = false,
}: StatCardProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex flex-col justify-between p-4 sm:p-4.5 rounded-xl border text-left transition-all duration-150',
        onClick && 'cursor-pointer select-none',
        active
          ? 'bg-orange-50/60 border-orange-400 ring-1 ring-orange-400/20 shadow-xs'
          : 'bg-white border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)] hover:border-slate-300/90 hover:bg-slate-50/40',
        className
      )}
    >
      {/* Top Header: Technical Eyebrow & Subtle Direct Icon */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'text-[11px] font-semibold uppercase tracking-wider leading-none truncate',
            active ? 'text-orange-950 font-bold' : 'text-slate-500'
          )}
        >
          {label}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {badge}
          <Icon
            className={cn(
              'h-4 w-4 stroke-[1.75]',
              active ? 'text-orange-600' : 'text-slate-500'
            )}
          />
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span
          className={cn(
            'text-2xl font-sans font-bold leading-none tabular-nums tracking-tight',
            active ? 'text-orange-950' : 'text-slate-900'
          )}
        >
          {value}
        </span>
      </div>

      {/* Metric Context & Threshold Metadata */}
      {subtext && (
        <div
          className={cn(
            'mt-2.5 pt-2 border-t flex items-center text-[12px] font-sans leading-tight',
            active
              ? 'border-orange-200/60 text-orange-800/80'
              : 'border-slate-100 text-slate-500'
          )}
        >
          <span className="truncate">{subtext}</span>
        </div>
      )}
    </Component>
  );
}
