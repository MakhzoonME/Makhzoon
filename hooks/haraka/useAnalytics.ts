'use client';

import { useQuery } from '@tanstack/react-query';

export type AnalyticsModuleKey = 'pos' | 'orders' | 'serviceJobs' | 'retainers' | 'appointments';

export interface ModuleSummary {
  count: number;
  revenue: number;
}

export interface HarakaAnalytics {
  from: string;
  to: string;
  modules: Record<AnalyticsModuleKey, ModuleSummary>;
  byDay: Array<{ date: string; revenue: number }>;
  totals: { count: number; revenue: number };
}

export interface UseHarakaAnalyticsParams {
  from?: Date;
  to?: Date;
  enabled?: boolean;
}

function buildQuery(params: UseHarakaAnalyticsParams): URLSearchParams {
  const q = new URLSearchParams();
  if (params.from) q.set('from', params.from.toISOString());
  if (params.to) q.set('to', params.to.toISOString());
  return q;
}

export function useHarakaAnalytics(params: UseHarakaAnalyticsParams) {
  const q = buildQuery(params);
  return useQuery<HarakaAnalytics>({
    queryKey: ['haraka', 'analytics', params.from?.toISOString(), params.to?.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/haraka/analytics?${q.toString()}`);
      if (!res.ok) throw new Error('Failed to load analytics');
      return res.json();
    },
    enabled: params.enabled ?? true,
    staleTime: 60_000,
  });
}

export function buildAnalyticsExportUrl(params: UseHarakaAnalyticsParams): string {
  const q = buildQuery(params);
  q.set('format', 'csv');
  return `/api/haraka/analytics?${q.toString()}`;
}
