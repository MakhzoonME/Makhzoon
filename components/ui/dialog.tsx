'use client';
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/* DS spec:
   Overlay: bg-black/40
   Content: rounded-xl (14px), shadow-lg, bg-surface-card, border-border
            max-w-[520px] form / max-w-[420px] confirm
   Header: flex items-center gap-[14px], px-6 py-5, border-b
           Icon slot: 40×40, rounded-lg (10px)
           Title: t-h4 (18px, weight 600)
   Body: px-6 py-5
   Footer: px-6 py-[14px], border-t, bg-surface-page */

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/40',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 w-full max-w-[520px] translate-x-[-50%] translate-y-[-50%]',
        'bg-surface-card rounded-xl border border-border shadow-lg overflow-hidden',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
        'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
        'duration-300',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute end-4 top-4 rounded-sm p-1 text-gray-400 opacity-70 transition-opacity hover:opacity-100 hover:text-gray-600 focus:outline-none focus:ring-[3px] focus:ring-primary-500/35 focus:ring-offset-2 focus:ring-offset-surface-card"
        aria-label="Close"
      >
        <X className="h-4 w-4" strokeWidth={1.75} />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col space-y-1 px-6 py-5 border-b border-border', className)}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse gap-2 px-6 py-[14px] border-t border-border bg-surface-page sm:flex-row sm:justify-end sm:gap-2',
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-[18px] font-semibold leading-[1.4] text-gray-900', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-[14px] leading-[1.6] text-gray-500 mt-1', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

/* Convenience sub-components that match the DS modal anatomy */

/** Modal header with icon slot — use for all modals with an icon */
const DialogIconHeader = ({
  icon,
  iconColor = 'var(--primary-600)',
  iconBg = 'var(--primary-50)',
  title,
  className,
}: {
  icon: React.ReactNode;
  iconColor?: string;
  iconBg?: string;
  title: string;
  className?: string;
}) => (
  <div className={cn('flex items-center gap-[14px] px-6 py-5 border-b border-border', className)}>
    <div
      className="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0"
      style={{ background: iconBg, color: iconColor }}
    >
      {icon}
    </div>
    <DialogPrimitive.Title className="text-[18px] font-semibold leading-[1.4] text-gray-900 flex-1">
      {title}
    </DialogPrimitive.Title>
  </div>
);

const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('px-6 py-5', className)} {...props} />
);

export {
  Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger,
  DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
  DialogIconHeader, DialogBody,
};
