import React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, checked, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    checked={checked}
    className={cn(
      'peer h-4 w-4 shrink-0 rounded border border-slate-300 bg-white transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 focus-visible:ring-offset-1',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600 data-[state=checked]:text-white',
      'data-[state=indeterminate]:bg-orange-600 data-[state=indeterminate]:border-orange-600 data-[state=indeterminate]:text-white',
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className={cn('flex items-center justify-center text-current')}>
      {checked === 'indeterminate' ? (
        <Minus className="h-3 w-3 stroke-[3]" />
      ) : (
        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
      )}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));

Checkbox.displayName = CheckboxPrimitive.Root.displayName;
