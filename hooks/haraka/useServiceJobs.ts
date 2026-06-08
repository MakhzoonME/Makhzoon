'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import type { HarakaServiceJob, ServiceJobStatus } from '@/types'
import type {
  CreateServiceJobPayload,
  UpdateServiceJobPayload,
} from '@/lib/modules/haraka/service-jobs/schemas'

export interface ServiceJobPaymentEntry {
  id:            string
  amount:        number
  paymentMethod: string | null
  note:          string | null
  paidAt:        string
  createdAt:     string
}

const LIST_KEY = ['haraka', 'service-jobs'] as const

function spaceHeaders(space?: string): HeadersInit {
  return space ? { 'x-space-slug': space } : {}
}

export interface UseServiceJobsParams {
  status?:        string
  serviceType?:   string
  staffMemberId?: string
  from?:          string
  to?:            string
  page?:          number
  pageSize?:      number
}

interface ListResp {
  items:      HarakaServiceJob[]
  total:      number
  page:       number
  pageSize:   number
  totalPages: number
}

export function useServiceJobs(params?: UseServiceJobsParams) {
  const { space } = useParams<{ space?: string }>()
  const query = new URLSearchParams()
  if (params?.status)        query.set('status', params.status)
  if (params?.serviceType)   query.set('serviceType', params.serviceType)
  if (params?.staffMemberId) query.set('staffMemberId', params.staffMemberId)
  if (params?.from)          query.set('from', params.from)
  if (params?.to)            query.set('to', params.to)
  if (params?.page)          query.set('page', String(params.page))
  if (params?.pageSize)      query.set('pageSize', String(params.pageSize))
  return useQuery<ListResp>({
    queryKey: [...LIST_KEY, space, params],
    enabled:  !!space,
    queryFn:  async () => {
      const res = await fetch(`/api/haraka/service-jobs?${query.toString()}`, { headers: spaceHeaders(space) })
      if (!res.ok) throw new Error('Failed to fetch service jobs')
      return res.json()
    },
    staleTime: 15_000,
  })
}

export function useServiceJob(id: string | undefined) {
  const { space } = useParams<{ space?: string }>()
  return useQuery<{ job: HarakaServiceJob }>({
    queryKey: ['haraka', 'service-jobs', space, id],
    enabled:  !!id && !!space,
    queryFn:  async () => {
      const res = await fetch(`/api/haraka/service-jobs/${id}`, { headers: spaceHeaders(space) })
      if (!res.ok) throw new Error('Failed to fetch service job')
      return res.json()
    },
  })
}

export function useCreateServiceJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateServiceJobPayload) => {
      const res = await fetch('/api/haraka/service-jobs', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to create service job')
      }
      return res.json() as Promise<{ job: HarakaServiceJob }>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  })
}

export function useUpdateServiceJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { id: string; body: UpdateServiceJobPayload }) => {
      const res = await fetch(`/api/haraka/service-jobs/${vars.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(vars.body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to update service job')
      }
      return res.json() as Promise<{ job: HarakaServiceJob }>
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: LIST_KEY })
      qc.invalidateQueries({ queryKey: ['haraka', 'service-jobs', undefined, vars.id] })
    },
  })
}

export function useUpdateServiceJobStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { id: string; status: ServiceJobStatus }) => {
      const res = await fetch(`/api/haraka/service-jobs/${vars.id}/status`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: vars.status }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to update status')
      }
      return res.json() as Promise<{ job: HarakaServiceJob }>
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: LIST_KEY })
      qc.invalidateQueries({ queryKey: ['haraka', 'service-jobs', undefined, vars.id] })
    },
  })
}

export function useGenerateServiceJobInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch(`/api/haraka/service-jobs/${jobId}/invoice`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to generate invoice')
      }
      return res.json() as Promise<{ job: HarakaServiceJob; invoiceNumber: string }>
    },
    onSuccess: (_, jobId) => {
      qc.invalidateQueries({ queryKey: ['haraka', 'service-jobs', undefined, jobId] })
    },
  })
}

export function useServiceJobPayments(jobId: string | undefined) {
  return useQuery<{ payments: ServiceJobPaymentEntry[] }>({
    queryKey: ['haraka', 'service-job-payments', jobId],
    enabled:  !!jobId,
    queryFn:  async () => {
      const res = await fetch(`/api/haraka/service-jobs/${jobId}/payments`)
      if (!res.ok) throw new Error('Failed to fetch payments')
      return res.json()
    },
    staleTime: 10_000,
  })
}

export function useAddServiceJobPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { jobId: string; amount: number; paymentMethod?: string | null; note?: string | null }) => {
      const res = await fetch(`/api/haraka/service-jobs/${vars.jobId}/payments`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ amount: vars.amount, paymentMethod: vars.paymentMethod, note: vars.note }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to add payment')
      }
      return res.json()
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['haraka', 'service-job-payments', vars.jobId] })
      qc.invalidateQueries({ queryKey: LIST_KEY })
    },
  })
}

export function useRemoveServiceJobPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { jobId: string; paymentId: string }) => {
      const res = await fetch(`/api/haraka/service-jobs/${vars.jobId}/payments/${vars.paymentId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to remove payment')
      }
      return res.json()
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['haraka', 'service-job-payments', vars.jobId] })
      qc.invalidateQueries({ queryKey: LIST_KEY })
    },
  })
}

export function useDeleteServiceJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/haraka/service-jobs/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to delete service job')
      }
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  })
}
