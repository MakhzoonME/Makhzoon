'use client';

import { useQuery } from '@tanstack/react-query';

export type AggregateGroupBy = 'day' | 'item' | 'cashier' | 'paymentMethod' | 'session';

export interface AggregateBucket {
  key: string;
  label: string;
  count: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  quantity?: number;
}

export interface AggregateResult {
  groupBy: AggregateGroupBy;
  from: string;
  to: string;
  buckets: AggregateBucket[];
  totals: {
    transactions: number;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    total: number;
  };
}

export interface UseHarakaReportParams {
  groupBy: AggregateGroupBy;
  from?: Date;
  to?: Date;
  topN?: number;
  enabled?: boolean;
}

function buildQuery(params: UseHarakaReportParams): URLSearchParams {
  const q = new URLSearchParams();
  q.set('groupBy', params.groupBy);
  if (params.from) q.set('from', params.from.toISOString());
  if (params.to) q.set('to', params.to.toISOString());
  if (params.topN) q.set('topN', String(params.topN));
  return q;
}

export function useHarakaReport(params: UseHarakaReportParams) {
  const q = buildQuery(params);
  return useQuery<AggregateResult>({
    queryKey: ['haraka', 'reports', params.groupBy, params.from?.toISOString(), params.to?.toISOString(), params.topN],
    queryFn: async () => {
      const res = await fetch(`/api/haraka/reports?${q.toString()}`);
      if (!res.ok) throw new Error('Failed to load report');
      return res.json();
    },
    enabled: params.enabled ?? true,
    staleTime: 60_000,
  });
}

export function buildReportExportUrl(params: UseHarakaReportParams): string {
  const q = buildQuery(params);
  q.set('format', 'csv');
  return `/api/haraka/reports?${q.toString()}`;
}
