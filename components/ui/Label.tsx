import React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

export interface LabelProps extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  required?: boolean;
}

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, children, required, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      'text-[13px] font-medium leading-none text-slate-700 select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 inline-flex items-center gap-1',
      className
    )}
    {...props}
  >
    {children}
    {required && <span className="text-red-500 font-semibold leading-none">*</span>}
  </LabelPrimitive.Root>
));

Label.displayName = 'Label';
