'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PosCustomer } from '@/types';
import type { CustomerFormData } from '@/lib/modules/haraka/customers/schemas';

const LIST_KEY = ['haraka', 'customers'] as const;

interface ListResp {
  items: PosCustomer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UseCustomersParams {
  search?: string;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function useCustomers(params: UseCustomersParams = {}) {
  const { enabled = true, ...query } = params;
  const qs = new URLSearchParams();
  if (query.search) qs.set('search', query.search);
  if (query.page) qs.set('page', String(query.page));
  if (query.pageSize) qs.set('pageSize', String(query.pageSize));
  return useQuery<ListResp>({
    queryKey: [...LIST_KEY, query],
    queryFn: async () => {
      const res = await fetch(`/api/haraka/customers?${qs.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch customers');
      return res.json();
    },
    staleTime: 30_000,
    enabled,
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery<{ customer: PosCustomer }>({
    queryKey: ['haraka', 'customers', id],
    queryFn: async () => {
      const res = await fetch(`/api/haraka/customers/${id}`);
      if (!res.ok) throw new Error('Failed to fetch customer');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CustomerFormData) => {
      const res = await fetch('/api/haraka/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to create customer');
      }
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; patch: Partial<CustomerFormData> }) => {
      const res = await fetch(`/api/haraka/customers/${vars.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars.patch),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to update customer');
      }
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: ['haraka', 'customers', vars.id] });
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/haraka/customers/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to delete customer');
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}
