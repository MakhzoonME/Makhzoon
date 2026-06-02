'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { ReportsResponse } from '@/types/report.types';

export function useReports() {
  const { space } = useParams<{ space?: string }>();
  return useQuery<ReportsResponse>({
    queryKey: ['reports', space],
    queryFn: async () => {
      const res = await fetch('/api/reports');
      if (!res.ok) throw new Error('Failed to fetch reports');
      return res.json();
    },
    staleTime: 60_000,
  });
}
