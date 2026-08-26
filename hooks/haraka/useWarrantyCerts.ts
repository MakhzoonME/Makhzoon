'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import type { HarakaWarrantyCert, HarakaWarrantyConfig } from '@/types';
import type { CreateWarrantyCertPayload, WarrantyConfigPatch } from '@/lib/modules/haraka/warranty-certs/schemas';

const LIST_KEY   = ['haraka', 'warranty-certs'] as const;
const CONFIG_KEY = ['haraka', 'warranty-config'] as const;

function spaceHeaders(space?: string): HeadersInit {
  return space ? { 'x-space-slug': space } : {};
}

export interface UseWarrantyCertsParams {
  orderId?: string;
  transactionId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

interface ListResp {
  items: HarakaWarrantyCert[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useWarrantyCerts(params?: UseWarrantyCertsParams) {
  const { space } = useParams<{ space?: string }>();
  const query = new URLSearchParams();
  if (params?.orderId)       query.set('orderId', params.orderId);
  if (params?.transactionId) query.set('transactionId', params.transactionId);
  if (params?.from)          query.set('from', params.from);
  if (params?.to)            query.set('to', params.to);
  if (params?.page)          query.set('page', String(params.page));
  if (params?.pageSize)      query.set('pageSize', String(params.pageSize));
  return useQuery<ListResp>({
    queryKey: [...LIST_KEY, space, params],
    enabled: !!space,
    queryFn: async () => {
      const res = await fetch(`/api/haraka/warranty-certs?${query.toString()}`, { headers: spaceHeaders(space) });
      if (!res.ok) throw new Error('Failed to fetch warranty certs');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useWarrantyCert(id: string | undefined) {
  const { space } = useParams<{ space?: string }>();
  return useQuery<{ cert: HarakaWarrantyCert }>({
    queryKey: ['haraka', 'warranty-cert', space, id],
    enabled: !!id && !!space,
    queryFn: async () => {
      const res = await fetch(`/api/haraka/warranty-certs/${id}`, { headers: spaceHeaders(space) });
      if (!res.ok) throw new Error('Failed to fetch warranty cert');
      return res.json();
    },
  });
}

export function useWarrantyCertByOrder(orderId: string | undefined) {
  const { space } = useParams<{ space?: string }>();
  return useQuery<ListResp>({
    queryKey: [...LIST_KEY, space, { orderId }],
    enabled: !!orderId && !!space,
    queryFn: async () => {
      const res = await fetch(`/api/haraka/warranty-certs?orderId=${orderId}`, { headers: spaceHeaders(space) });
      if (!res.ok) throw new Error('Failed to fetch warranty cert');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useCreateWarrantyCert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateWarrantyCertPayload) => {
      const res = await fetch('/api/haraka/warranty-certs', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to create warranty certificate');
      }
      return res.json() as Promise<{ cert: HarakaWarrantyCert }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useDeleteWarrantyCert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/haraka/warranty-certs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete warranty certificate');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useWarrantyConfig() {
  return useQuery<{ config: HarakaWarrantyConfig }>({
    queryKey: CONFIG_KEY,
    queryFn: async () => {
      const res = await fetch('/api/haraka/warranty-config');
      if (!res.ok) throw new Error('Failed to fetch warranty config');
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useUpdateWarrantyConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: WarrantyConfigPatch) => {
      const res = await fetch('/api/haraka/warranty-config', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to update config');
      }
      return res.json() as Promise<{ config: HarakaWarrantyConfig }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CONFIG_KEY }),
  });
}
