'use client';
import * as React from 'react';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/* DS spec:
   Viewport: fixed bottom-right, max-w-[360px], gap-2, p-4
   Toast: w-full rounded-lg border shadow-md px-[14px] py-3, flex gap-3, auto-dismiss 4000ms
   4 tones: success / error / warning / info
   Icon area: 32×32 rounded-md
   Title: text-[13.5px] font-semibold
   Description: text-[12.5px] text-gray-500 leading-[1.5] */

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'fixed bottom-4 end-4 z-[100] flex flex-col gap-2 w-[360px] max-w-[calc(100vw-2rem)]',
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

/* tone → { border, bg, iconBg, iconColor } */
const TONES = {
  default: {
    border: 'border-border',
    bg: 'bg-surface-card',
    iconBg: 'bg-surface-page',
    iconColor: 'text-gray-500',
  },
  success: {
    border: 'border-[var(--green-100)]',
    bg: 'bg-surface-card',
    iconBg: 'bg-[var(--green-50)]',
    iconColor: 'text-[var(--green-600)]',
  },
  error: {
    border: 'border-[var(--red-100)]',
    bg: 'bg-surface-card',
    iconBg: 'bg-[var(--red-50)]',
    iconColor: 'text-[var(--red-600)]',
  },
  warning: {
    border: 'border-[var(--yellow-100)]',
    bg: 'bg-surface-card',
    iconBg: 'bg-[var(--yellow-50)]',
    iconColor: 'text-[var(--amber-500)]',
  },
  info: {
    border: 'border-[var(--blue-100)]',
    bg: 'bg-surface-card',
    iconBg: 'bg-[var(--blue-50)]',
    iconColor: 'text-[var(--blue-600)]',
  },
} as const;

type ToastVariant = keyof typeof TONES;

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & { variant?: ToastVariant }
>(({ className, variant = 'default', ...props }, ref) => {
  const t = TONES[variant];
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(
        'group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-lg border px-[14px] py-3 shadow-md transition-all',
        'data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]',
        'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full',
        'data-[state=open]:slide-in-from-bottom-full',
        t.border, t.bg,
        className
      )}
      {...props}
    />
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

/* Icon slot — used by ToastProvider to show tone icon */
const ToastIconSlot = ({ variant = 'default', children }: { variant?: ToastVariant; children: React.ReactNode }) => {
  const t = TONES[variant];
  return (
    <div className={cn('flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-md', t.iconBg)}>
      <span className={cn('flex items-center justify-center', t.iconColor)}>{children}</span>
    </div>
  );
};

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      'inline-flex h-7 shrink-0 items-center justify-center rounded-md border border-border bg-transparent px-3 text-[12px] font-medium transition-colors',
      'hover:bg-surface-page focus:outline-none focus:ring-[3px] focus:ring-primary-500/20',
      className
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      'absolute top-2.5 end-2.5 rounded-sm p-0.5 text-gray-400 opacity-0 transition-opacity hover:text-gray-600 hover:opacity-100 focus:opacity-100 focus:outline-none group-hover:opacity-100',
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-3.5 w-3.5" strokeWidth={1.75} />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn('text-[13.5px] font-semibold text-gray-900 leading-[1.4]', className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn('text-[12.5px] text-gray-500 leading-[1.5] mt-0.5', className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;
type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  ToastProvider, ToastViewport, Toast, ToastIconSlot,
  ToastTitle, ToastDescription, ToastClose, ToastAction,
};
export type { ToastProps, ToastActionElement, ToastVariant };
