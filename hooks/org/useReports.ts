'use client';
import { useQuery } from '@tanstack/react-query';
import { ReportsResponse } from '@/types/report.types';

export function useReports() {
  return useQuery<ReportsResponse>({
    queryKey: ['reports'],
    queryFn: async () => {
      const res = await fetch('/api/reports');
      if (!res.ok) throw new Error('Failed to fetch reports');
      return res.json();
    },
    staleTime: 60_000,
  });
}
