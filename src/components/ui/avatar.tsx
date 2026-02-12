import { cn } from '@/lib/utils';
import * as React from 'react';
import { forwardRef } from 'react';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'square';
  src?: string;
  alt?: string;
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size = 'md', shape = 'circle', src, alt = 'Avatar', ...props }, ref) => {
    const sizes: Record<string, string> = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base', lg: 'w-12 h-12 text-lg', xl: 'w-16 h-16 text-xl' };
    const shapes: Record<string, string> = { circle: 'rounded-full', square: 'rounded-lg' };

    if (src) {
      return <div ref={ref} className={cn('relative overflow-hidden bg-surface-200', sizes[size], shapes[shape], className)} {...props}><img src={src} alt={alt} className="w-full h-full object-cover" /></div>;
    }
    return <div ref={ref} className={cn('flex items-center justify-center bg-primary-100 text-primary-700 font-medium', sizes[size], shapes[shape], className)} {...props}>{alt.charAt(0).toUpperCase()}</div>;
  }
);
Avatar.displayName = 'Avatar';

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> { max?: number; }

export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, max = 3, children, ...props }, ref) => {
    const childrenArray = React.Children.toArray(children);
    const visibleChildren = childrenArray.slice(0, max);
    const remainingCount = childrenArray.length - max;

    return (
      <div ref={ref} className={cn('flex -space-x-2', className)} {...props}>
        {visibleChildren}
        {remainingCount > 0 && <div className={cn('flex items-center justify-center rounded-full bg-surface-200 text-surface-600 font-medium ring-2 ring-white')}>+{remainingCount}</div>}
      </div>
    );
  }
);
AvatarGroup.displayName = 'AvatarGroup';
