'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const PIN_KEY = ['haraka', 'discount-approval-pin'] as const;

export function useDiscountApprovalPin() {
  return useQuery<{ hasPin: boolean }>({
    queryKey: PIN_KEY,
    queryFn: async () => {
      const res = await fetch('/api/haraka/discount-approval/pin');
      if (!res.ok) throw new Error('Failed to fetch PIN status');
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useSetDiscountApprovalPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pin: string | null) => {
      const res = await fetch('/api/haraka/discount-approval/pin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to update PIN');
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PIN_KEY }),
  });
}
