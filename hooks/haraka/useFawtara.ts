'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FawtaraConfig, FawtaraSubmission } from '@/types';

const CONFIG_KEY = ['haraka', 'fawtara', 'config'] as const;

export function useFawtaraConfig() {
  return useQuery<{ config: FawtaraConfig }>({
    queryKey: CONFIG_KEY,
    queryFn: async () => {
      const res = await fetch('/api/jo-fotara/config');
      if (!res.ok) throw new Error('Failed to fetch Fawtara config');
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useUpdateFawtaraConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      body: Partial<FawtaraConfig> & { clientId?: string | null; clientSecret?: string | null },
    ) => {
      const res = await fetch('/api/jo-fotara/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to update Fawtara config');
      }
      return res.json() as Promise<{ config: FawtaraConfig }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CONFIG_KEY }),
  });
}

export function useResubmitFawtara() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (transactionId: string) => {
      const res = await fetch(`/api/jo-fotara/submit/${transactionId}`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Resubmit failed');
      }
      return res.json() as Promise<{ submission: FawtaraSubmission }>;
    },
    onSuccess: (_data, transactionId) => {
      qc.invalidateQueries({ queryKey: ['haraka', 'transactions', transactionId] });
      qc.invalidateQueries({ queryKey: ['haraka', 'transactions'] });
    },
  });
}
