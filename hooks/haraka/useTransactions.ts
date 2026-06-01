'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import type { PosTransaction } from '@/types';
import type { CompleteSalePayload, RefundPayload } from '@/lib/modules/haraka/transactions/schemas';

const LIST_KEY = ['haraka', 'transactions'] as const;

interface ListResp {
  items: PosTransaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useTransactions(params?: { sessionId?: string; status?: 'completed' | 'refunded' | 'voided'; page?: number; pageSize?: number }) {
  const { space } = useParams<{ space?: string }>();
  const query = new URLSearchParams();
  if (params?.sessionId) query.set('sessionId', params.sessionId);
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  return useQuery<ListResp>({
    queryKey: [...LIST_KEY, space, params],
    queryFn: async () => {
      const res = await fetch(`/api/haraka/transactions?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    },
    staleTime: 15_000,
  });
}

export function useTransaction(id: string | undefined) {
  const { space } = useParams<{ space?: string }>();
  return useQuery<{ transaction: PosTransaction }>({
    queryKey: ['haraka', 'transactions', space, id],
    queryFn: async () => {
      const res = await fetch(`/api/haraka/transactions/${id}`);
      if (!res.ok) throw new Error('Failed to fetch transaction');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCompleteSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CompleteSalePayload) => {
      const res = await fetch('/api/haraka/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to complete sale');
      }
      return res.json() as Promise<{ transaction: PosTransaction }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['haraka', 'sessions'] });
    },
  });
}

export function useVoidSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/haraka/transactions/${id}/void`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to void sale');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useRefundSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; body?: RefundPayload }) => {
      const res = await fetch(`/api/haraka/transactions/${vars.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars.body ?? {}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to refund sale');
      }
      return res.json() as Promise<{ refundTransactionId: string }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
