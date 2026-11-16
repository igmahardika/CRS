import React from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'icon-sm' | 'icon-md';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center font-sans font-medium text-[13px] leading-none transition-colors duration-150 rounded-lg select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed';

    const variantClasses = {
      primary:
        'bg-orange-600 text-white hover:bg-orange-700 focus-visible:ring-orange-500/40 focus-visible:ring-offset-white border border-transparent shadow-sm',
      secondary:
        'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 focus-visible:ring-orange-500/40 focus-visible:ring-offset-white shadow-sm',
      ghost:
        'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-orange-500/40 focus-visible:ring-offset-white border border-transparent',
      destructive:
        'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/40 focus-visible:ring-offset-white border border-transparent shadow-sm',
    };

    const sizeClasses = {
      sm: 'h-8 px-3 gap-1.5',
      md: 'h-9 px-4 gap-2',
      'icon-sm': 'h-8 w-8 p-0',
      'icon-md': 'h-9 w-9 p-0',
    };

    const accessibleLabel = props['aria-label'] || props.title;

    return (
      <button
        ref={ref}
        type={props.type || 'button'}
        aria-label={accessibleLabel}
        disabled={disabled || loading}
        className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        {...props}
      >
        {loading ? (
          <>
            <Spinner size={size === 'sm' || size === 'icon-sm' ? 'sm' : 'md'} />
            {size !== 'icon-sm' && size !== 'icon-md' && children && <span>{children}</span>}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
