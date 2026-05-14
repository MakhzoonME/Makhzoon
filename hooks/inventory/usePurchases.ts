'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Purchase, PurchaseStatus } from '@/types';
import type { PurchaseFormData } from '@/lib/modules/inventory/purchases/schemas';

const LIST_KEY = ['inventory', 'purchases'] as const;

interface ListResp {
  items: Purchase[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function usePurchases(params?: { status?: PurchaseStatus; search?: string; page?: number; pageSize?: number }) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  return useQuery<ListResp>({
    queryKey: [...LIST_KEY, params],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/purchases?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch purchases');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function usePurchase(id: string | undefined) {
  return useQuery<{ purchase: Purchase }>({
    queryKey: ['inventory', 'purchases', id],
    queryFn: async () => {
      const res = await fetch(`/api/inventory/purchases/${id}`);
      if (!res.ok) throw new Error('Failed to fetch purchase');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: PurchaseFormData) => {
      const res = await fetch('/api/inventory/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to create purchase');
      }
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useUpdatePurchase(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<PurchaseFormData>) => {
      const res = await fetch(`/api/inventory/purchases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to update purchase');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: ['inventory', 'purchases', id] });
    },
  });
}

export function useDeletePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/inventory/purchases/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to delete purchase');
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useReceivePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/inventory/purchases/${id}/receive`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to receive purchase');
      }
      return res.json();
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: ['inventory', 'purchases', id] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
