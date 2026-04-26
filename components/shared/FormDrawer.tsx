'use client';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils/cn';

function XSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

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
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed right-0 top-0 bottom-0 z-50 bg-white shadow-xl flex flex-col w-full',
            widthClass,
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
            'duration-300',
          )}
          aria-describedby={description ? 'form-drawer-desc' : undefined}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div>
              <DialogPrimitive.Title className="text-base font-semibold text-gray-900">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <p id="form-drawer-desc" className="text-sm text-gray-500 mt-0.5">{description}</p>
              )}
            </div>
            <DialogPrimitive.Close
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <XSvg />
            </DialogPrimitive.Close>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
