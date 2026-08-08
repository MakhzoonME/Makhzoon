'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import type { LoyaltyProgram, LoyaltyMember, LoyaltyTransaction } from '@/types'
import type { UpdateLoyaltyProgramPayload } from '@/lib/modules/loyalty/schemas'

const PROGRAM_KEY = ['loyalty', 'program'] as const

function spaceHeaders(space?: string): HeadersInit {
  return space ? { 'x-space-slug': space } : {}
}

export function useLoyaltyProgram() {
  const { space } = useParams<{ space?: string }>()
  return useQuery<{ program: LoyaltyProgram }>({
    queryKey: [...PROGRAM_KEY, space],
    enabled: !!space,
    queryFn: async () => {
      const res = await fetch('/api/loyalty/program', { headers: spaceHeaders(space) })
      if (!res.ok) throw new Error('Failed to fetch loyalty program')
      return res.json()
    },
    staleTime: 60_000,
  })
}

export function useUpdateLoyaltyProgram() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: UpdateLoyaltyProgramPayload) => {
      const res = await fetch('/api/loyalty/program', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to update program')
      }
      return res.json() as Promise<{ program: LoyaltyProgram }>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PROGRAM_KEY }),
  })
}

export function useEnrollLoyaltyMember() {
  return useMutation({
    mutationFn: async (customerId: string) => {
      const res = await fetch('/api/loyalty/members', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ customerId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to enroll customer')
      }
      return res.json() as Promise<{ member: LoyaltyMember }>
    },
  })
}

export function useLoyaltyMemberTransactions(memberId: string | undefined) {
  return useQuery<{ transactions: LoyaltyTransaction[] }>({
    queryKey: ['loyalty', 'transactions', memberId],
    enabled:  !!memberId,
    queryFn:  async () => {
      const res = await fetch(`/api/loyalty/members/${memberId}/transactions`)
      if (!res.ok) throw new Error('Failed to fetch loyalty transactions')
      return res.json()
    },
  })
}
