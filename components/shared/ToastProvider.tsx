'use client';
import { useState } from 'react';
import { Check, X, AlertTriangle, Info } from 'lucide-react';
import {
  ToastProvider, ToastViewport, Toast, ToastIconSlot,
  ToastTitle, ToastDescription, ToastClose,
  type ToastVariant,
} from '@/components/ui/toast';
import { useToastListener } from '@/hooks/ui';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  open: boolean;
}

const TONE_ICONS: Record<NonNullable<ToastVariant>, React.ReactNode> = {
  default: <Info className="h-4 w-4" strokeWidth={1.75} />,
  success: <Check className="h-4 w-4" strokeWidth={2} />,
  error:   <X className="h-4 w-4" strokeWidth={2} />,
  warning: <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />,
  info:    <Info className="h-4 w-4" strokeWidth={1.75} />,
};

export function AppToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useToastListener((toast) => {
    setToasts((prev) => [...prev, { ...toast, open: true }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 4000);
  });

  return (
    <ToastProvider duration={4000}>
      {children}
      {toasts.map((t) => {
        const variant = t.variant ?? 'default';
        return (
          <Toast
            key={t.id}
            open={t.open}
            variant={variant}
            onOpenChange={(open) => {
              if (!open) setToasts((prev) => prev.filter((x) => x.id !== t.id));
            }}
          >
            <ToastIconSlot variant={variant}>
              {TONE_ICONS[variant]}
            </ToastIconSlot>
            <div className="flex-1 min-w-0 pe-4">
              <ToastTitle>{t.title}</ToastTitle>
              {t.description && <ToastDescription>{t.description}</ToastDescription>}
            </div>
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
