'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import type { HarakaDeliveryAgent } from '@/types';
import type { DeliveryAgentFormData } from '@/lib/modules/haraka/delivery-agents/schemas';

const LIST_KEY = ['haraka', 'delivery-agents'] as const;

function spaceHeaders(space?: string): HeadersInit {
  return space ? { 'x-space-slug': space } : {};
}

export function useDeliveryAgents(onlyActive = false) {
  const { space } = useParams<{ space?: string }>();
  return useQuery<{ items: HarakaDeliveryAgent[] }>({
    queryKey: [...LIST_KEY, space, onlyActive],
    enabled: !!space,
    queryFn: async () => {
      const qs = onlyActive ? '?active=true' : '';
      const res = await fetch(`/api/haraka/delivery-agents${qs}`, { headers: spaceHeaders(space) });
      if (!res.ok) throw new Error('Failed to fetch delivery agents');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useCreateDeliveryAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: DeliveryAgentFormData) => {
      const res = await fetch('/api/haraka/delivery-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to create agent');
      }
      return res.json() as Promise<{ agent: HarakaDeliveryAgent }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useUpdateDeliveryAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; body: Partial<DeliveryAgentFormData> }) => {
      const res = await fetch(`/api/haraka/delivery-agents/${vars.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars.body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to update agent');
      }
      return res.json() as Promise<{ agent: HarakaDeliveryAgent }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useDeleteDeliveryAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/haraka/delivery-agents/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to delete agent');
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}
