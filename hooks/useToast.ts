'use client';
import { useState, useCallback } from 'react';

type ToastVariant = 'default' | 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  title: string;
  variant?: ToastVariant;
}

let toastListeners: Array<(toast: ToastMessage) => void> = [];

export function toast(title: string, variant: ToastVariant = 'default') {
  const id = Math.random().toString(36).slice(2);
  toastListeners.forEach((fn) => fn({ id, title, variant }));
}

toast.success = (title: string) => toast(title, 'success');
toast.error = (title: string) => toast(title, 'error');
toast.info = (title: string) => toast(title, 'info');

export function useToastListener(callback: (toast: ToastMessage) => void) {
  const [, setCount] = useState(0);
  const stable = useCallback(callback, []);

  if (!toastListeners.includes(stable)) {
    toastListeners = [...toastListeners.filter((fn) => fn !== stable), stable];
  }

  return () => {
    toastListeners = toastListeners.filter((fn) => fn !== stable);
  };
}
