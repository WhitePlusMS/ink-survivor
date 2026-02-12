import { cn } from '@/lib/utils';
import { forwardRef } from 'react';
import { Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'info', title, dismissible, onDismiss, children, ...props }, ref) => {
    const variants = {
      info: { container: 'bg-blue-50 border-blue-200 text-blue-800', icon: 'text-blue-500' },
      success: { container: 'bg-green-50 border-green-200 text-green-800', icon: 'text-green-500' },
      warning: { container: 'bg-yellow-50 border-yellow-200 text-yellow-800', icon: 'text-yellow-500' },
      error: { container: 'bg-red-50 border-red-200 text-red-800', icon: 'text-red-500' },
    };

    const icons = { info: Info, success: CheckCircle, warning: AlertTriangle, error: XCircle };
    const Icon = icons[variant];

    return (
      <div ref={ref} className={cn('flex gap-3 p-4 rounded-lg border', variants[variant].container, className)} role="alert" {...props}>
        <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', variants[variant].icon)} />
        <div className="flex-1">
          {title && <p className="font-medium mb-1">{title}</p>}
          <div className="text-sm">{children}</div>
        </div>
        {dismissible && (
          <button onClick={onDismiss} className={cn('flex-shrink-0 p-1 hover:bg-black/5 rounded', variants[variant].icon)}>
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
);
Alert.displayName = 'Alert';
