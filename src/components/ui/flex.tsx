import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef } from 'react';

interface FlexProps extends HTMLAttributes<HTMLDivElement> {}

export const Flex = forwardRef<HTMLDivElement, FlexProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('flex', className)} {...props}>{children}</div>
  )
);
Flex.displayName = 'Flex';

export const InlineFlex = forwardRef<HTMLDivElement, FlexProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('inline-flex', className)} {...props}>{children}</div>
  )
);
InlineFlex.displayName = 'InlineFlex';
