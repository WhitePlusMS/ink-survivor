import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  state?: 'default' | 'error' | 'success';
  errorMessage?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, state = 'default', errorMessage, children, ...props }, ref) => (
    <div className="w-full">
      <select ref={ref} className={cn('flex h-10 w-full appearance-none rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50', state === 'default' ? 'border-surface-300 focus:border-primary-500 focus:ring-primary-500' : state === 'error' ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-green-500 focus:border-green-500 focus:ring-green-500', className)} {...props}>{children}</select>
      {errorMessage && <p className="mt-1 text-sm text-red-500">{errorMessage}</p>}
    </div>
  )
);
Select.displayName = 'Select';
