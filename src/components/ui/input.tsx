import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  state?: 'default' | 'error' | 'success';
  errorMessage?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, state = 'default', errorMessage, ...props }, ref) => (
    <div className="w-full">
      <input ref={ref} className={cn('flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm placeholder:text-surface-400 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-0', state === 'default' ? 'border-surface-300 focus:border-primary-500 focus:ring-primary-500' : state === 'error' ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-green-500 focus:border-green-500 focus:ring-green-500', className)} {...props} />
      {errorMessage && <p className="mt-1 text-sm text-red-500">{errorMessage}</p>}
    </div>
  )
);
Input.displayName = 'Input';
