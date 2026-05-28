'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ListKey } from '@/types';

interface UpsertInput {
  listKey: ListKey;
  value: string;
  label?: string | null;
  labelAr?: string | null;
  color?: string | null;
  enabled?: boolean;
}

/** Add or override an item for the caller's own org. */
export function useUpsertOrgListItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpsertInput) => {
      const res = await fetch('/api/org/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to save item');
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['list', vars.listKey] }),
  });
}

/** Remove an org's custom item / override. */
export function useDeleteOrgListItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { listKey: ListKey; value: string }) => {
      const res = await fetch('/api/org/lists', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to delete item');
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['list', vars.listKey] }),
  });
}
