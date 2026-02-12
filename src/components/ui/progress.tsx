import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'error';
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, size = 'md', showLabel = false, color = 'primary', ...props }, ref) => {
    const sizes: Record<string, string> = { sm: 'h-1', md: 'h-2', lg: 'h-3' };
    const colors: Record<string, string> = { primary: 'bg-primary-500', success: 'bg-green-500', warning: 'bg-yellow-500', error: 'bg-red-500' };

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {showLabel && <div className="flex justify-between mb-1 text-sm text-surface-600"><span>进度</span><span>{Math.round(value)}%</span></div>}
        <div className={cn('w-full bg-surface-200 rounded-full overflow-hidden', sizes[size])}>
          <div className={cn('h-full rounded-full transition-all duration-300', colors[color])} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
        </div>
      </div>
    );
  }
);
Progress.displayName = 'Progress';
