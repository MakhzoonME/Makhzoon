'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { ReportsResponse } from '@/types/report.types';

export function useReports() {
  const { space } = useParams<{ space?: string }>();
  return useQuery<ReportsResponse>({
    queryKey: ['reports', space],
    enabled: !!space,
    queryFn: async () => {
      // BUG-12 fix: send x-space-slug header so the API resolves the correct
      // space-scoped tenant context instead of falling back to default space.
      const headers: HeadersInit = space ? { 'x-space-slug': space } : {};
      const res = await fetch('/api/reports', { headers });
      if (!res.ok) throw new Error('Failed to fetch reports');
      return res.json();
    },
    staleTime: 60_000,
  });
}
