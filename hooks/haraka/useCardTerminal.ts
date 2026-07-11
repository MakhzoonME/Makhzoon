'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import type { HarakaCardTerminalConfig, HarakaCardCharge, CardChargeStatus } from '@/types';
import type { CardTerminalConfigPatch, InitiateChargeInput } from '@/lib/modules/haraka/card-terminal/schemas';

const CONFIG_KEY = ['haraka', 'card-terminal-config'] as const;

function spaceHeaders(space?: string): HeadersInit {
  return space ? { 'x-space-slug': space } : {};
}

export function useCardTerminalConfig() {
  const { space } = useParams<{ space?: string }>();
  return useQuery<{ config: HarakaCardTerminalConfig }>({
    queryKey: [...CONFIG_KEY, space],
    enabled: !!space,
    queryFn: async () => {
      const res = await fetch('/api/haraka/card-terminal-config', { headers: spaceHeaders(space) });
      if (!res.ok) throw new Error('Failed to fetch card terminal config');
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useUpdateCardTerminalConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CardTerminalConfigPatch) => {
      const res = await fetch('/api/haraka/card-terminal-config', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to update config');
      }
      return res.json() as Promise<{ config: HarakaCardTerminalConfig }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CONFIG_KEY }),
  });
}

export function useInitiateCharge() {
  return useMutation({
    mutationFn: async (input: InitiateChargeInput) => {
      const res = await fetch('/api/haraka/card-charges', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to initiate charge');
      }
      return res.json() as Promise<{ charge: HarakaCardCharge }>;
    },
  });
}

/** Polls the charge status every 3s while the charge is still pending. */
export function useChargeStatus(ref: string | null, enabled: boolean) {
  return useQuery<{ charge: HarakaCardCharge }>({
    queryKey: ['haraka', 'card-charge', ref],
    enabled:  !!ref && enabled,
    queryFn: async () => {
      const res = await fetch(`/api/haraka/card-charges/${encodeURIComponent(ref!)}/status`);
      if (!res.ok) throw new Error('Failed to fetch charge status');
      return res.json();
    },
    refetchInterval: (query) => {
      const status: CardChargeStatus | undefined = query.state.data?.charge?.status;
      // Stop polling once a terminal state is reached
      return status && status !== 'pending' ? false : 3_000;
    },
    staleTime: 0,
  });
}

export function useUpdateChargeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { ref: string; status: CardChargeStatus; providerRef?: string }) => {
      const res = await fetch(`/api/haraka/card-charges/${encodeURIComponent(vars.ref)}/status`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: vars.status, providerRef: vars.providerRef }),
      });
      if (!res.ok) throw new Error('Failed to update charge status');
      return res.json() as Promise<{ charge: HarakaCardCharge }>;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['haraka', 'card-charge', vars.ref] });
    },
  });
}
