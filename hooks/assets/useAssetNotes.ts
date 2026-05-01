'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AssetNote } from '@/types';

export function useAssetNotes(assetId: string) {
  return useQuery<AssetNote[]>({
    queryKey: ['asset-notes', assetId],
    queryFn: async () => {
      const res = await fetch(`/api/assets/${assetId}/notes`);
      if (!res.ok) throw new Error('Failed to fetch notes');
      return res.json();
    },
    enabled: !!assetId,
    staleTime: 30_000,
  });
}

export function useCreateAssetNote(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch(`/api/assets/${assetId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('Failed to add note');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['asset-notes', assetId] }),
  });
}

export function useDeleteAssetNote(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      const res = await fetch(`/api/assets/${assetId}/notes/${noteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete note');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['asset-notes', assetId] }),
  });
}
