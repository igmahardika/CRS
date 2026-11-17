import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: LucideIcon;
  title?: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  action,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-10 px-4 text-center rounded-xl border border-dashed border-slate-200/90 bg-slate-50/40',
        className
      )}
    >
      <Icon className="h-8 w-8 text-slate-400 stroke-[1.5] mb-2.5" />
      {title && (
        <h3 className="text-sm font-heading font-semibold text-slate-800 mb-1">
          {title}
        </h3>
      )}
      <p className="max-w-md text-xs font-sans text-slate-500 leading-relaxed mb-3.5">
        {description}
      </p>
      {action ? (
        action
      ) : actionLabel && onAction ? (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
      {children}
    </div>
  );
}
