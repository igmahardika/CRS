import React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, disabled, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        disabled={disabled}
        className={cn(
          'flex min-h-[80px] w-full bg-white text-slate-900 placeholder:text-slate-400 font-sans text-[13px] border rounded-lg px-3 py-2 transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
          error
            ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/25 text-red-950'
            : 'border-slate-200 focus-visible:border-orange-600 focus-visible:ring-orange-500/25',
          disabled && 'bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed opacity-75',
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
