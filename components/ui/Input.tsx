import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  inputSize?: 'sm' | 'md';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, inputSize = 'md', type = 'text', disabled, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          'w-full bg-white text-slate-900 placeholder:text-slate-400 font-sans text-[13px] border rounded-lg transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
          inputSize === 'sm' ? 'h-8 px-2.5 py-1' : 'h-9 px-3 py-1.5',
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

Input.displayName = 'Input';
