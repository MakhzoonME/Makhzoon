'use client';
import { useState } from 'react';
import { ToastProvider, ToastViewport, Toast, ToastTitle, ToastClose } from '@/components/ui/toast';
import { useToastListener } from '@/hooks/ui';

interface ToastItem {
  id: string;
  title: string;
  variant?: 'default' | 'success' | 'error' | 'info';
  open: boolean;
}

export function AppToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useToastListener((toast) => {
    setToasts((prev) => [...prev, { ...toast, open: true }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 4000);
  });

  return (
    <ToastProvider>
      {children}
      {toasts.map((t) => (
        <Toast key={t.id} open={t.open} variant={t.variant} onOpenChange={(open) => {
          if (!open) setToasts((prev) => prev.filter((x) => x.id !== t.id));
        }}>
          <ToastTitle>{t.title}</ToastTitle>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
