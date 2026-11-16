import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'neutral' | 'success' | 'destructive' | 'warning' | 'info' | 'soft' | 'outline';
  dot?: boolean;
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'neutral', dot = false, children, ...props }, ref) => {
    const variantClasses = {
      neutral: 'bg-slate-100 text-slate-700 border-slate-200',
      success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      destructive: 'bg-red-50 text-red-700 border-red-200',
      warning: 'bg-amber-50 text-amber-700 border-amber-200',
      info: 'bg-blue-50 text-blue-700 border-blue-200',
      soft: 'bg-orange-50 text-orange-700 border-orange-200',
      outline: 'bg-transparent text-slate-700 border-slate-200',
    };

    const dotColorClasses = {
      neutral: 'bg-slate-400',
      success: 'bg-emerald-500',
      destructive: 'bg-red-500',
      warning: 'bg-amber-500',
      info: 'bg-blue-500',
      soft: 'bg-orange-600',
      outline: 'bg-slate-400',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[12px] font-sans font-medium border leading-none tracking-tight select-none',
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
