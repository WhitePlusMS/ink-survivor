import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef } from 'react';

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const containerSizes: Record<string, string> = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-full',
};

export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = 'md', children, ...props }, ref) => (
    <div ref={ref} className={cn('mx-auto px-4 sm:px-6 lg:px-8', containerSizes[size], className)} {...props}>
      {children}
    </div>
  )
);
Container.displayName = 'Container';
