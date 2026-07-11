'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import type { HarakaRetainer, HarakaRetainerInvoice, RetainerStatus } from '@/types'
import type {
  CreateRetainerPayload,
  UpdateRetainerPayload,
  CreateRetainerInvoicePayload,
  UpdateRetainerInvoicePayload,
} from '@/lib/modules/haraka/retainers/schemas'

const LIST_KEY = ['haraka', 'retainers'] as const

function spaceHeaders(space?: string): HeadersInit {
  return space ? { 'x-space-slug': space } : {}
}

export interface UseRetainersParams {
  status?:   string
  page?:     number
  pageSize?: number
}

interface ListResp {
  items:      HarakaRetainer[]
  total:      number
  page:       number
  pageSize:   number
  totalPages: number
}

export function useRetainers(params?: UseRetainersParams) {
  const { space } = useParams<{ space?: string }>()
  const query = new URLSearchParams()
  if (params?.status)   query.set('status', params.status)
  if (params?.page)     query.set('page', String(params.page))
  if (params?.pageSize) query.set('pageSize', String(params.pageSize))
  return useQuery<ListResp>({
    queryKey: [...LIST_KEY, space, params],
    enabled:  !!space,
    queryFn:  async () => {
      const res = await fetch(`/api/haraka/retainers?${query.toString()}`, { headers: spaceHeaders(space) })
      if (!res.ok) throw new Error('Failed to fetch retainers')
      return res.json()
    },
    staleTime: 15_000,
  })
}

export function useRetainer(id: string | undefined) {
  const { space } = useParams<{ space?: string }>()
  return useQuery<{ retainer: HarakaRetainer }>({
    queryKey: ['haraka', 'retainers', space, id],
    enabled:  !!id && !!space,
    queryFn:  async () => {
      const res = await fetch(`/api/haraka/retainers/${id}`, { headers: spaceHeaders(space) })
      if (!res.ok) throw new Error('Failed to fetch retainer')
      return res.json()
    },
  })
}

export function useCreateRetainer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateRetainerPayload) => {
      const res = await fetch('/api/haraka/retainers', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to create retainer')
      }
      return res.json() as Promise<{ retainer: HarakaRetainer }>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  })
}

export function useUpdateRetainer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { id: string; body: UpdateRetainerPayload }) => {
      const res = await fetch(`/api/haraka/retainers/${vars.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(vars.body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to update retainer')
      }
      return res.json() as Promise<{ retainer: HarakaRetainer }>
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: LIST_KEY })
      qc.invalidateQueries({ queryKey: ['haraka', 'retainers', undefined, vars.id] })
    },
  })
}

export function useUpdateRetainerStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { id: string; status: RetainerStatus }) => {
      const res = await fetch(`/api/haraka/retainers/${vars.id}/status`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: vars.status }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to update status')
      }
      return res.json() as Promise<{ retainer: HarakaRetainer }>
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: LIST_KEY })
      qc.invalidateQueries({ queryKey: ['haraka', 'retainers', undefined, vars.id] })
    },
  })
}

export function useDeleteRetainer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/haraka/retainers/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to delete retainer')
      }
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  })
}

export function useRetainerInvoices(retainerId: string | undefined) {
  return useQuery<{ invoices: HarakaRetainerInvoice[] }>({
    queryKey: ['haraka', 'retainer-invoices', retainerId],
    enabled:  !!retainerId,
    queryFn:  async () => {
      const res = await fetch(`/api/haraka/retainers/${retainerId}/invoices`)
      if (!res.ok) throw new Error('Failed to fetch invoices')
      return res.json()
    },
    staleTime: 15_000,
  })
}

export function useCreateRetainerInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { retainerId: string; body: CreateRetainerInvoicePayload }) => {
      const res = await fetch(`/api/haraka/retainers/${vars.retainerId}/invoices`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(vars.body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to create invoice')
      }
      return res.json() as Promise<{ invoice: HarakaRetainerInvoice }>
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['haraka', 'retainer-invoices', vars.retainerId] })
      qc.invalidateQueries({ queryKey: LIST_KEY })
    },
  })
}

export function useUpdateRetainerInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { retainerId: string; invoiceId: string; body: UpdateRetainerInvoicePayload }) => {
      const res = await fetch(`/api/haraka/retainers/${vars.retainerId}/invoices/${vars.invoiceId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(vars.body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to update invoice')
      }
      return res.json() as Promise<{ invoice: HarakaRetainerInvoice }>
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['haraka', 'retainer-invoices', vars.retainerId] })
    },
  })
}

export function useDeleteRetainerInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { retainerId: string; invoiceId: string }) => {
      const res = await fetch(`/api/haraka/retainers/${vars.retainerId}/invoices/${vars.invoiceId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to delete invoice')
      }
      return res.json()
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['haraka', 'retainer-invoices', vars.retainerId] })
    },
  })
}
