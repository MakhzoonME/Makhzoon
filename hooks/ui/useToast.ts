'use client';
import { useEffect, useRef } from 'react';

type ToastVariant = 'default' | 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  title: string;
  variant?: ToastVariant;
}

const toastListeners = new Set<(toast: ToastMessage) => void>();

export function toast(title: string, variant: ToastVariant = 'default') {
  const id = Math.random().toString(36).slice(2);
  toastListeners.forEach((fn) => fn({ id, title, variant }));
}

toast.success = (title: string) => toast(title, 'success');
toast.error = (title: string) => toast(title, 'error');
toast.info = (title: string) => toast(title, 'info');

export function useToastListener(callback: (toast: ToastMessage) => void) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const listener = (msg: ToastMessage) => callbackRef.current(msg);
    toastListeners.add(listener);
    return () => {
      toastListeners.delete(listener);
    };
  }, []);
}
