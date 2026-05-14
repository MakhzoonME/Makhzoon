'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TaxRate } from '@/types';

const KEY = ['haraka', 'tax-rates'] as const;

interface ListResp {
  taxRates: TaxRate[];
}

export function useTaxRates() {
  return useQuery<ListResp>({
    queryKey: KEY,
    queryFn: async () => {
      const res = await fetch('/api/haraka/tax-rates');
      if (!res.ok) throw new Error('Failed to fetch tax rates');
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useCreateTaxRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; rate: number; isDefault?: boolean }) => {
      const res = await fetch('/api/haraka/tax-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to create tax rate');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateTaxRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; patch: { name?: string; rate?: number; isDefault?: boolean } }) => {
      const res = await fetch(`/api/haraka/tax-rates/${vars.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars.patch),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to update tax rate');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteTaxRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/haraka/tax-rates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to delete tax rate');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
