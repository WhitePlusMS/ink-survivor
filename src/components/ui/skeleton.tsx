import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'text', width, height, ...props }, ref) => (
    <div ref={ref} className={cn('animate-pulse bg-surface-200', variant === 'text' ? 'rounded' : variant === 'circular' ? 'rounded-full' : 'rounded-lg', className)} style={{ width, height: height || (variant === 'text' ? '1em' : undefined) }} {...props} />
  )
);
Skeleton.displayName = 'Skeleton';

export const SkeletonCard = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-xl bg-white p-4 shadow-sm space-y-3', className)} {...props}>
      <Skeleton variant="rectangular" width="100%" height="120px" />
      <Skeleton width="60%" />
      <Skeleton width="80%" />
      <Skeleton width="40%" />
    </div>
  )
);
SkeletonCard.displayName = 'SkeletonCard';
