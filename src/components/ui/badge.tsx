import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'outline';
  size?: 'sm' | 'md';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => (
    <span ref={ref} className={cn('inline-flex items-center rounded-full font-medium', variant === 'default' ? 'bg-surface-100 text-surface-700' : variant === 'primary' ? 'bg-primary-100 text-primary-700' : variant === 'success' ? 'bg-green-100 text-green-700' : variant === 'warning' ? 'bg-yellow-100 text-yellow-700' : variant === 'error' ? 'bg-red-100 text-red-700' : 'border border-surface-300 text-surface-600', size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm', className)} {...props} />
  )
);
Badge.displayName = 'Badge';
