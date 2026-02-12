'use client';

import { cn } from '@/lib/utils';
import { createContext, useContext, useState, useCallback, forwardRef } from 'react';
import * as React from 'react';
import { X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

const ToastItem = ({ toast, onClose }: ToastItemProps) => {
  const styles = { success: 'bg-green-500 text-white', error: 'bg-red-500 text-white', warning: 'bg-yellow-500 text-white', info: 'bg-primary-500 text-white' };

  return (
    <div className={cn('flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[200px]', 'animate-slide-in', styles[toast.type])}>
      <span className="flex-1 text-sm font-medium">{toast.message}</span>
      <button onClick={onClose} className="p-1 hover:bg-white/20 rounded transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string;
  type?: Toast['type'];
}

export const Toast = forwardRef<HTMLDivElement, ToastProps>(
  ({ className, message, type = 'info', ...props }, ref) => {
    const styles = { success: 'bg-green-500 text-white', error: 'bg-red-500 text-white', warning: 'bg-yellow-500 text-white', info: 'bg-primary-500 text-white' };
    return <div ref={ref} className={cn('flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg', styles[type], className)} {...props}><span className="text-sm font-medium">{message}</span></div>;
  }
);
Toast.displayName = 'Toast';
