'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PaymentLog, PaymentLogMethod } from '@/types';

export interface PaymentLogPayload {
  subscriptionId: string;
  amount: number;
  currency: string;
  method: PaymentLogMethod;
  reference?: string | null;
  /** ISO date string or Date — the API parses both. */
  paidAt: string | Date;
  notes?: string | null;
}

export function usePaymentLogs(orgId: string) {
  return useQuery<PaymentLog[]>({
    queryKey: ['payment-logs', orgId],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${orgId}/payments`);
      if (!res.ok) throw new Error('Failed to fetch payment logs');
      return res.json();
    },
    enabled: !!orgId,
  });
}

export function useCreatePaymentLog(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PaymentLogPayload) => {
      const res = await fetch(`/api/organizations/${orgId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to record payment');
      return res.json() as Promise<PaymentLog>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-logs', orgId] }),
  });
}

export function useDeletePaymentLog(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (logId: string) => {
      const res = await fetch(`/api/organizations/${orgId}/payments/${logId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete payment log');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-logs', orgId] }),
  });
}
