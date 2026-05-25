'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PlatformListItem, ListKey } from '@/types';
import type { PlatformListItemInput } from '@/lib/validations/list-item.schema';

/** All platform list items (superadmin catalog), grouped client-side by listKey. */
export function usePlatformLists() {
  return useQuery<PlatformListItem[]>({
    queryKey: ['platform-lists'],
    queryFn: async () => {
      const res = await fetch('/api/superadmin/lists', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch lists');
      return res.json();
    },
  });
}

export function useCreatePlatformListItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PlatformListItemInput) => {
      const res = await fetch('/api/superadmin/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to create item');
      return res.json() as Promise<PlatformListItem>;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['platform-lists'] });
      qc.invalidateQueries({ queryKey: ['list', vars.listKey as ListKey] });
    },
  });
}

export function useUpdatePlatformListItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<PlatformListItem, 'label' | 'labelAr' | 'color' | 'sortOrder' | 'enabled'>>;
    }) => {
      const res = await fetch(`/api/superadmin/lists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to update item');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-lists'] });
      qc.invalidateQueries({ queryKey: ['list'] });
    },
  });
}

export function useDeletePlatformListItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/superadmin/lists/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to delete item');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-lists'] });
      qc.invalidateQueries({ queryKey: ['list'] });
    },
  });
}
