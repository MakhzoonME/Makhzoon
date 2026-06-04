'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import type { HarakaOrder, OrderStatus } from '@/types';
import type { CreateOrderPayload, UpdateOrderPayload, RecordPaymentPayload } from '@/lib/modules/haraka/orders/schemas';

const LIST_KEY = ['haraka', 'orders'] as const;

function spaceHeaders(space?: string): HeadersInit {
  return space ? { 'x-space-slug': space } : {};
}

export interface UseOrdersParams {
  status?: string;
  channel?: string;
  salesAgentId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

interface ListResp {
  items: HarakaOrder[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useOrders(params?: UseOrdersParams) {
  const { space } = useParams<{ space?: string }>();
  const query = new URLSearchParams();
  if (params?.status)       query.set('status', params.status);
  if (params?.channel)      query.set('channel', params.channel);
  if (params?.salesAgentId) query.set('salesAgentId', params.salesAgentId);
  if (params?.from)         query.set('from', params.from);
  if (params?.to)           query.set('to', params.to);
  if (params?.page)         query.set('page', String(params.page));
  if (params?.pageSize)     query.set('pageSize', String(params.pageSize));
  return useQuery<ListResp>({
    queryKey: [...LIST_KEY, space, params],
    enabled: !!space,
    queryFn: async () => {
      const res = await fetch(`/api/haraka/orders?${query.toString()}`, { headers: spaceHeaders(space) });
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json();
    },
    staleTime: 15_000,
  });
}

export function useOrder(id: string | undefined) {
  const { space } = useParams<{ space?: string }>();
  return useQuery<{ order: HarakaOrder }>({
    queryKey: ['haraka', 'orders', space, id],
    enabled: !!id && !!space,
    queryFn: async () => {
      const res = await fetch(`/api/haraka/orders/${id}`, { headers: spaceHeaders(space) });
      if (!res.ok) throw new Error('Failed to fetch order');
      return res.json();
    },
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateOrderPayload) => {
      const res = await fetch('/api/haraka/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to create order');
      }
      return res.json() as Promise<{ order: HarakaOrder }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; body: UpdateOrderPayload }) => {
      const res = await fetch(`/api/haraka/orders/${vars.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars.body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to update order');
      }
      return res.json() as Promise<{ order: HarakaOrder }>;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: ['haraka', 'orders', vars.id] });
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; status: OrderStatus }) => {
      const res = await fetch(`/api/haraka/orders/${vars.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: vars.status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to update status');
      }
      return res.json() as Promise<{ order: HarakaOrder }>;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: ['haraka', 'orders', vars.id] });
    },
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; body: RecordPaymentPayload }) => {
      const res = await fetch(`/api/haraka/orders/${vars.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars.body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to record payment');
      }
      return res.json() as Promise<{ order: HarakaOrder }>;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: ['haraka', 'orders', vars.id] });
    },
  });
}
