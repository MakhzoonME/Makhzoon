'use client';
import { useRef, useState } from 'react';
import { Check, X, AlertTriangle, Info, Loader2 } from 'lucide-react';
import {
  ToastProvider, ToastViewport, Toast, ToastIconSlot,
  ToastTitle, ToastDescription, ToastClose,
  type ToastVariant,
} from '@/components/ui/toast';
import { useToastListener } from '@/hooks/ui';
import type { ToastAction } from '@/hooks/ui';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  loading?: boolean;
  action?: ToastAction;
  open: boolean;
}

const TONE_ICONS: Record<NonNullable<ToastVariant>, React.ReactNode> = {
  default: <Info className="h-4 w-4" strokeWidth={1.75} />,
  success: <Check className="h-4 w-4" strokeWidth={2} />,
  error:   <X className="h-4 w-4" strokeWidth={2} />,
  warning: <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />,
  info:    <Info className="h-4 w-4" strokeWidth={1.75} />,
};

const DEFAULT_DURATION = 4000;

export function AppToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  function remove(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
  }

  function scheduleDismiss(id: string, duration: number) {
    const existing = timers.current.get(id);
    if (existing) clearTimeout(existing);
    timers.current.set(id, setTimeout(() => remove(id), duration));
  }

  useToastListener((e) => {
    if (e.kind === 'add') {
      const t = e.toast;
      setToasts((prev) => [...prev.filter((x) => x.id !== t.id), { ...t, open: true }]);
      if (!t.loading) scheduleDismiss(t.id, t.duration ?? DEFAULT_DURATION);
    } else if (e.kind === 'update') {
      setToasts((prev) => prev.map((t) => (t.id === e.id ? { ...t, ...e.patch } : t)));
      // Once a toast stops loading, give it a longer window so any action
      // (e.g. "Download again") stays reachable.
      if (e.patch.loading === false) scheduleDismiss(e.id, e.patch.duration ?? 8000);
    } else if (e.kind === 'dismiss') {
      remove(e.id);
    }
  });

  return (
    <ToastProvider duration={DEFAULT_DURATION}>
      {children}
      {toasts.map((t) => {
        const variant = t.variant ?? 'default';
        return (
          <Toast
            key={t.id}
            open={t.open}
            variant={variant}
            duration={t.loading ? Infinity : undefined}
            onOpenChange={(open) => { if (!open) remove(t.id); }}
          >
            <ToastIconSlot variant={variant}>
              {t.loading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : TONE_ICONS[variant]}
            </ToastIconSlot>
            <div className="flex-1 min-w-0 pe-4">
              <ToastTitle>{t.title}</ToastTitle>
              {t.description && <ToastDescription>{t.description}</ToastDescription>}
              {t.action && (
                <button
                  type="button"
                  onClick={() => t.action?.onClick()}
                  className="mt-1.5 text-[12px] font-semibold text-primary-600 hover:text-primary-700 underline underline-offset-2"
                >
                  {t.action.label}
                </button>
              )}
            </div>
            {!t.loading && <ToastClose />}
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
