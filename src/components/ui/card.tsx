import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated';
  clickable?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', clickable = false, children, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-xl transition-all duration-200', variant === 'default' ? 'bg-white shadow-sm' : variant === 'bordered' ? 'bg-white border border-surface-200' : 'bg-white shadow-md', clickable ? 'cursor-pointer hover:shadow-lg active:scale-[0.99]' : '', className)} {...props}>
      {children}
    </div>
  )
);
Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('px-4 py-3 border-b border-surface-100', className)} {...props}>{children}</div>
  )
);
CardHeader.displayName = 'CardHeader';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('px-4 py-3', className)} {...props}>{children}</div>
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('px-4 py-3 border-t border-surface-100', className)} {...props}>{children}</div>
  )
);
CardFooter.displayName = 'CardFooter';
