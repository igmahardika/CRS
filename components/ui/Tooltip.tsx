'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Info, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 overflow-hidden rounded-md bg-slate-900 px-3 py-1.5 text-xs text-slate-100 shadow-md',
        'border border-slate-800 max-w-xs leading-relaxed animate-in fade-in-0 zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        'data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1',
        'data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1',
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/**
 * Standard InfoTooltip component
 * Renders an accessible (i) trigger that reveals helpful context on hover or focus.
 */
export interface InfoTooltipProps {
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
  iconClassName?: string;
  variant?: 'info' | 'help';
}

export function InfoTooltip({
  content,
  side = 'top',
  align = 'center',
  className,
  iconClassName,
  variant = 'info',
}: InfoTooltipProps) {
  const Icon = variant === 'help' ? HelpCircle : Info;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center justify-center rounded text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 cursor-help',
              className
            )}
            onClick={(e) => e.preventDefault()}
            aria-label="More information"
          >
            <Icon className={cn('w-3.5 h-3.5 shrink-0', iconClassName)} />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} align={align}>
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
