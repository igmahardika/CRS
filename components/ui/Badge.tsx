import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'neutral' | 'success' | 'destructive' | 'warning' | 'info' | 'soft' | 'outline';
  dot?: boolean;
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'neutral', dot = false, children, ...props }, ref) => {
    const variantClasses = {
      neutral: 'bg-slate-100/80 text-slate-700 border-slate-200/90',
      success: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
      destructive: 'bg-rose-50 text-rose-800 border-rose-200/90',
      warning: 'bg-amber-50 text-amber-800 border-amber-200/90',
      info: 'bg-blue-50 text-blue-800 border-blue-200/90',
      soft: 'bg-orange-50 text-orange-800 border-orange-200/90',
      outline: 'bg-transparent text-slate-700 border-slate-200/90',
    };

    const dotColorClasses = {
      neutral: 'bg-slate-400',
      success: 'bg-emerald-600',
      destructive: 'bg-rose-600',
      warning: 'bg-amber-600',
      info: 'bg-blue-600',
      soft: 'bg-orange-600',
      outline: 'bg-slate-400',
    };

    return (
      <div
        ref={ref}
        suppressHydrationWarning
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-sans font-semibold border leading-tight tracking-tight select-none',
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColorClasses[variant])} />}
        <span>{children}</span>
      </div>
    );
  }
);

Badge.displayName = 'Badge';
