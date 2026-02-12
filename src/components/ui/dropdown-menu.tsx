'use client';

import { cn } from '@/lib/utils';
import { createContext, useContext, useState, useRef, useEffect, forwardRef } from 'react';

interface DropdownContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const DropdownContext = createContext<DropdownContextValue | undefined>(undefined);

export interface DropdownProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultOpen?: boolean;
  trigger: React.ReactNode;
}

export const DropdownMenu = forwardRef<HTMLDivElement, DropdownProps>(
  ({ className, defaultOpen = false, trigger, children, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const triggerRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (triggerRef.current?.contains(event.target as Node)) return;
        setIsOpen(false);
      };

      if (isOpen) document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
      <DropdownContext.Provider value={{ isOpen, setIsOpen, triggerRef }}>
        <div ref={ref} className={cn('relative inline-block', className)} {...props}>
          <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
          {isOpen && (
            <div className="absolute z-50 mt-2 min-w-[160px] rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
              <div className="py-1">{children}</div>
            </div>
          )}
        </div>
      </DropdownContext.Provider>
    );
  }
);
DropdownMenu.displayName = 'DropdownMenu';

export interface DropdownItemProps extends React.HTMLAttributes<HTMLDivElement> {
  disabled?: boolean;
  divider?: boolean;
  icon?: React.ReactNode;
}

export const DropdownItem = forwardRef<HTMLDivElement, DropdownItemProps>(
  ({ className, disabled, divider, icon, children, ...props }, ref) => {
    const context = useContext(DropdownContext);
    if (!context) throw new Error('DropdownItem must be used within DropdownMenu');

    if (divider) {
      return <div ref={ref} className={cn('my-1 h-px bg-surface-200', className)} {...props} />;
    }

    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-2 px-4 py-2 text-sm text-surface-700', 'cursor-pointer hover:bg-surface-100 transition-colors', disabled && 'opacity-50 cursor-not-allowed pointer-events-none', className)}
        onClick={() => !disabled && context.setIsOpen(false)}
        {...props}
      >
        {icon && <span className="w-4 h-4">{icon}</span>}
        {children}
      </div>
    );
  }
);
DropdownItem.displayName = 'DropdownItem';
