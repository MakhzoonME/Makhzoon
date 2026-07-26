'use client';
import { useEffect, useRef } from 'react';

export type ToastVariant = 'default' | 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Persistent spinner state — no auto-dismiss until updated/dismissed. */
  loading?: boolean;
  /** Optional action button (e.g. "Download again"). */
  action?: ToastAction;
  /** Auto-dismiss delay in ms once not loading (default 4000). */
  duration?: number;
}

export type ToastEvent =
  | { kind: 'add'; toast: ToastMessage }
  | { kind: 'update'; id: string; patch: Partial<ToastMessage> }
  | { kind: 'dismiss'; id: string };

const listeners = new Set<(e: ToastEvent) => void>();
function emit(e: ToastEvent) {
  listeners.forEach((fn) => fn(e));
}
function genId() {
  return Math.random().toString(36).slice(2);
}

/** Fire a simple auto-dismissing toast (backwards-compatible API). */
export function toast(title: string, variant: ToastVariant = 'default') {
  const id = genId();
  emit({ kind: 'add', toast: { id, title, variant } });
  return id;
}
toast.success = (title: string) => toast(title, 'success');
toast.error = (title: string) => toast(title, 'error');
toast.info = (title: string) => toast(title, 'info');

/** Create a toast (optionally persistent/loading). Returns its id. */
export function createToast(msg: Omit<ToastMessage, 'id'> & { id?: string }): string {
  const id = msg.id ?? genId();
  emit({ kind: 'add', toast: { ...msg, id } });
  return id;
}

/** Update an existing toast by id (e.g. loading → success with an action). */
export function updateToast(id: string, patch: Partial<ToastMessage>) {
  emit({ kind: 'update', id, patch });
}

/** Remove a toast immediately. */
export function dismissToast(id: string) {
  emit({ kind: 'dismiss', id });
}

export function useToastListener(callback: (e: ToastEvent) => void) {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  useEffect(() => {
    const listener = (e: ToastEvent) => callbackRef.current(e);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
}
