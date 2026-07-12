'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import type { HarakaReceptionTicket, PosTransaction } from '@/types'
import type {
  CreateTicketPayload,
  UpdateTicketPayload,
  CheckoutTicketPayload,
} from '@/lib/modules/haraka/reception-tickets/schemas'

const LIST_KEY = ['haraka', 'reception-tickets'] as const

function spaceHeaders(space?: string): HeadersInit {
  return space ? { 'x-space-slug': space } : {}
}

export interface UseReceptionTicketsParams {
  status?:   string
  page?:     number
  pageSize?: number
  /** Poll interval in ms — the register queue uses this to pick up new tickets. */
  refetchInterval?: number
  enabled?: boolean
}

interface ListResp {
  items:      HarakaReceptionTicket[]
  total:      number
  page:       number
  pageSize:   number
  totalPages: number
}

export function useReceptionTickets(params?: UseReceptionTicketsParams) {
  const { space } = useParams<{ space?: string }>()
  const query = new URLSearchParams()
  if (params?.status)   query.set('status', params.status)
  if (params?.page)     query.set('page', String(params.page))
  if (params?.pageSize) query.set('pageSize', String(params.pageSize))
  return useQuery<ListResp>({
    queryKey: [...LIST_KEY, space, { status: params?.status, page: params?.page, pageSize: params?.pageSize }],
    enabled:  !!space && (params?.enabled ?? true),
    queryFn:  async () => {
      const res = await fetch(`/api/haraka/reception-tickets?${query.toString()}`, { headers: spaceHeaders(space) })
      if (!res.ok) throw new Error('Failed to fetch reception tickets')
      return res.json()
    },
    staleTime:       10_000,
    refetchInterval: params?.refetchInterval,
  })
}

export function useReceptionTicket(id: string | undefined) {
  const { space } = useParams<{ space?: string }>()
  return useQuery<{ ticket: HarakaReceptionTicket }>({
    queryKey: [...LIST_KEY, space, id],
    enabled:  !!id && !!space,
    queryFn:  async () => {
      const res = await fetch(`/api/haraka/reception-tickets/${id}`, { headers: spaceHeaders(space) })
      if (!res.ok) throw new Error('Failed to fetch reception ticket')
      return res.json()
    },
  })
}

export function useCreateReceptionTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateTicketPayload) => {
      const res = await fetch('/api/haraka/reception-tickets', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to create ticket')
      }
      return res.json() as Promise<{ ticket: HarakaReceptionTicket }>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY })
      qc.invalidateQueries({ queryKey: ['haraka', 'service-jobs'] })
    },
  })
}

export function useUpdateReceptionTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { id: string; body: UpdateTicketPayload }) => {
      const res = await fetch(`/api/haraka/reception-tickets/${vars.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(vars.body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to update ticket')
      }
      return res.json() as Promise<{ ticket: HarakaReceptionTicket }>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY })
      qc.invalidateQueries({ queryKey: ['haraka', 'service-jobs'] })
    },
  })
}

export function useCancelReceptionTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/haraka/reception-tickets/${id}/status`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: 'cancelled' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to cancel ticket')
      }
      return res.json() as Promise<{ ticket: HarakaReceptionTicket }>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY })
      qc.invalidateQueries({ queryKey: ['haraka', 'service-jobs'] })
    },
  })
}

export function useCheckoutReceptionTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { id: string; body: CheckoutTicketPayload }) => {
      const res = await fetch(`/api/haraka/reception-tickets/${vars.id}/checkout`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(vars.body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Checkout failed')
      }
      return res.json() as Promise<{ ticket: HarakaReceptionTicket; transaction: PosTransaction | null }>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY })
      qc.invalidateQueries({ queryKey: ['haraka', 'service-jobs'] })
    },
  })
}
