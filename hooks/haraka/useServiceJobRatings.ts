'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'

export interface RatingsSummary {
  average: number | null
  count: number
  recentLow: { jobNumber: string; rating: number; comment: string | null; submittedAt: string }[]
}

export function useServiceJobRatingsSummary() {
  const { space } = useParams<{ space?: string }>()
  return useQuery<RatingsSummary>({
    queryKey: ['haraka', 'service-job-ratings-summary', space],
    enabled:  !!space,
    queryFn:  async () => {
      const headers: HeadersInit = space ? { 'x-space-slug': space } : {}
      const res = await fetch('/api/haraka/service-jobs/ratings-summary', { headers })
      if (!res.ok) throw new Error('Failed to fetch ratings summary')
      return res.json()
    },
    staleTime: 30_000,
  })
}
