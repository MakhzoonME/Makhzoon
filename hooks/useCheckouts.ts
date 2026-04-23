'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AssetCheckout } from '@/types';
import { CheckoutFormData } from '@/lib/validations/asset-checkout.schema';

export function useCheckouts(assetId: string) {
  return useQuery<AssetCheckout[]>({
    queryKey: ['checkouts', assetId],
    queryFn: async () => {
      const res = await fetch(`/api/assets/${assetId}/checkout`);
      if (!res.ok) throw new Error('Failed to fetch checkouts');
      return res.json();
    },
    enabled: !!assetId,
    staleTime: 30_000,
  });
}

export function useCheckoutAsset(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CheckoutFormData) => {
      const res = await fetch(`/api/assets/${assetId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to check out asset');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checkouts', assetId] });
      qc.invalidateQueries({ queryKey: ['assets', assetId] });
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useReturnAsset(assetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (checkoutId: string) => {
      const res = await fetch(`/api/assets/${assetId}/checkout/${checkoutId}`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to return asset');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checkouts', assetId] });
      qc.invalidateQueries({ queryKey: ['assets', assetId] });
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
