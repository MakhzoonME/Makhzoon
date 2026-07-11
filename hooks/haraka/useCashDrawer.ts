'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

export interface CashDrawerConfig {
  enabled: boolean;
  autoOpenOnCash: boolean;
  requirePin: boolean;
  drawerPort: 0 | 1;
  onTimeMs: number;
  offTimeMs: number;
}

const CONFIG_KEY = ['haraka', 'cash-drawer-config'] as const;

function spaceHeaders(space?: string): HeadersInit {
  return space ? { 'x-space-slug': space } : {};
}

export function useCashDrawerConfig() {
  const { space } = useParams<{ space?: string }>();
  return useQuery<{ config: CashDrawerConfig }>({
    queryKey: [...CONFIG_KEY, space],
    enabled: !!space,
    queryFn: async () => {
      const res = await fetch('/api/haraka/cash-drawer-config', { headers: spaceHeaders(space) });
      if (!res.ok) throw new Error('Failed to fetch cash drawer config');
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useUpdateCashDrawerConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<CashDrawerConfig> & { pin?: string | null }) => {
      const res = await fetch('/api/haraka/cash-drawer-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to update config');
      }
      return res.json() as Promise<{ config: CashDrawerConfig }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CONFIG_KEY }),
  });
}

export function useVerifyDrawerPin() {
  return useMutation({
    mutationFn: async (pin: string): Promise<boolean> => {
      const res = await fetch('/api/haraka/cash-drawer-config/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Verification failed');
      }
      const data = await res.json();
      return data.ok === true;
    },
  });
}
