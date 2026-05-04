import * as React from 'react';
import { cn } from '@/lib/utils/cn';

/* DS spec: h=36px, px=12px, rounded-md (8px), border-border, bg-surface-card
   focus: border-primary-600, ring 3px rgba(79,70,229,0.12)
   error: border-red-600, bg-red-50, ring red */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  prefixIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, prefixIcon, ...props }, ref) => {
    if (prefixIcon) {
      return (
        <div
          className={cn(
            'flex items-center gap-2 h-9 px-3 rounded-md border bg-surface-card shadow-xs transition-colors',
            error
              ? 'border-red-600 bg-red-50 focus-within:ring-[3px] focus-within:ring-red-500/20'
              : 'border-border hover:border-border-strong focus-within:border-primary-600 focus-within:ring-[3px] focus-within:ring-primary-500/20',
          )}
        >
          <span className="text-gray-400 flex-shrink-0 flex items-center">{prefixIcon}</span>
          <input
            type={type}
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-[14px] text-gray-900 placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50 h-full"
            ref={ref}
            {...props}
          />
        </div>
      );
    }
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border bg-surface-card px-3 py-1 text-[14px] text-gray-900 shadow-xs',
          'transition-colors placeholder:text-gray-400',
          'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/20 focus-visible:border-primary-600',
          'hover:border-border-strong',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-red-500 bg-red-50 focus-visible:ring-red-500/20 focus-visible:border-red-500'
            : 'border-border',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
