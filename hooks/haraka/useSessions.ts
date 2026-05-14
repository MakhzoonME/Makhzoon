'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PosSession } from '@/types';

const LIST_KEY = ['haraka', 'sessions'] as const;
const CURRENT_KEY = ['haraka', 'sessions', 'current'] as const;

interface ListResp {
  items: PosSession[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useSessions(params?: { status?: 'open' | 'closed'; page?: number; pageSize?: number }) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  return useQuery<ListResp>({
    queryKey: [...LIST_KEY, params],
    queryFn: async () => {
      const res = await fetch(`/api/haraka/sessions?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch sessions');
      return res.json();
    },
    staleTime: 30_000,
  });
}

/** Caller's own currently-open session, or null. Cheap to poll — short staleTime. */
export function useCurrentSession() {
  return useQuery<{ session: PosSession | null }>({
    queryKey: CURRENT_KEY,
    queryFn: async () => {
      const res = await fetch('/api/haraka/sessions?mine=current');
      if (!res.ok) throw new Error('Failed to fetch current session');
      return res.json();
    },
    staleTime: 15_000,
  });
}

export function useSession(id: string | undefined) {
  return useQuery<{ session: PosSession; expectedCashSoFar: number }>({
    queryKey: ['haraka', 'sessions', id],
    queryFn: async () => {
      const res = await fetch(`/api/haraka/sessions/${id}`);
      if (!res.ok) throw new Error('Failed to fetch session');
      return res.json();
    },
    enabled: !!id,
    staleTime: 10_000,
  });
}

export function useOpenSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { openingFloat: number; locationId?: string }) => {
      const res = await fetch('/api/haraka/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to open session');
      }
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CURRENT_KEY });
      qc.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useCloseSession(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { closingFloat: number; notes?: string | null }) => {
      const res = await fetch(`/api/haraka/sessions/${id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to close session');
      }
      return res.json() as Promise<{ expectedFloat: number; discrepancy: number }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CURRENT_KEY });
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: ['haraka', 'sessions', id] });
    },
  });
}
