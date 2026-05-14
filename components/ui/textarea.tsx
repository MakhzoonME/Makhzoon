import * as React from 'react';
import { cn } from '@/lib/utils/cn';

/* DS spec: rounded-md (8px), border-border, bg-surface-card, min-h 64px
   focus: border-primary-600, ring 3px */

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[64px] w-full rounded-md border bg-surface-card px-3 py-2 text-[14px] text-gray-900 shadow-xs',
        'transition-colors placeholder:text-gray-500 leading-[1.6]',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-500/35 focus-visible:border-primary-600',
        'hover:border-border-strong',
        'disabled:cursor-not-allowed disabled:bg-surface-page disabled:text-gray-700 disabled:border-border',
        error
          ? 'border-red-500 bg-red-50 focus-visible:ring-red-500/20 focus-visible:border-red-500'
          : 'border-border',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

export { Textarea };
