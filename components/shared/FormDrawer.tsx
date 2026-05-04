'use client';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface FormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  width?: 'md' | 'lg' | 'xl';
}

export function FormDrawer({ open, onOpenChange, title, description, children, width = 'lg' }: FormDrawerProps) {
  const widthClass = { md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' }[width];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed end-0 top-0 bottom-0 z-50 bg-surface-card border-s border-border shadow-xl flex flex-col w-full',
            widthClass,
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
            'duration-300',
          )}
          aria-describedby={description ? 'form-drawer-desc' : undefined}
        >
          <div className="flex items-center justify-between px-6 py-[18px] border-b border-border flex-shrink-0">
            <div>
              <DialogPrimitive.Title className="text-[18px] font-semibold leading-[1.4] text-gray-900">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <p id="form-drawer-desc" className="text-[14px] leading-[1.6] text-gray-500 mt-1">{description}</p>
              )}
            </div>
            <DialogPrimitive.Close
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-[3px] focus:ring-primary-500/20"
              aria-label="Close"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
