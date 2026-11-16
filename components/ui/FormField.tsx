import React from 'react';
import { Label } from './Label';
import { cn } from '@/lib/utils';

export interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('flex flex-col space-y-1.5', className)}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-[12px] font-sans font-medium text-red-600 leading-tight">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] font-sans text-slate-500 leading-tight">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
