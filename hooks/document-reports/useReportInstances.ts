'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import type { DocumentReportInstance, ReportAttachment, ReportEncounterType } from '@/types'

const LIST_KEY = ['document-reports', 'instances'] as const

function spaceHeaders(space?: string): HeadersInit {
  return space ? { 'x-space-slug': space } : {}
}

export interface UseReportInstancesParams {
  customerId?: string
  templateId?: string
  encounterType?: ReportEncounterType
  encounterId?: string
  page?: number
  pageSize?: number
  enabled?: boolean
}

export function useReportInstances(params: UseReportInstancesParams = {}) {
  const { space } = useParams<{ space?: string }>()
  const { enabled = true, ...query } = params
  const qs = new URLSearchParams()
  if (query.customerId) qs.set('customerId', query.customerId)
  if (query.templateId) qs.set('templateId', query.templateId)
  if (query.encounterType) qs.set('encounterType', query.encounterType)
  if (query.encounterId) qs.set('encounterId', query.encounterId)
  if (query.page) qs.set('page', String(query.page))
  if (query.pageSize) qs.set('pageSize', String(query.pageSize))
  return useQuery<{ items: DocumentReportInstance[]; total: number }>({
    queryKey: [...LIST_KEY, space, query],
    enabled: enabled && !!space,
    queryFn: async () => {
      const res = await fetch(`/api/document-reports/instances?${qs.toString()}`, { headers: spaceHeaders(space) })
      if (!res.ok) throw new Error('Failed to fetch reports')
      return res.json()
    },
    staleTime: 15_000,
  })
}

export function useReportInstance(id: string | undefined) {
  const { space } = useParams<{ space?: string }>()
  return useQuery<{ report: DocumentReportInstance }>({
    queryKey: [...LIST_KEY, space, id],
    enabled: !!id && !!space,
    queryFn: async () => {
      const res = await fetch(`/api/document-reports/instances/${id}`, { headers: spaceHeaders(space) })
      if (!res.ok) throw new Error('Failed to fetch report')
      return res.json()
    },
  })
}

export function useCreateReportInstance() {
  const qc = useQueryClient()
  const { space } = useParams<{ space?: string }>()
  return useMutation({
    mutationFn: async (body: {
      templateId: string
      customerId: string
      encounterType: ReportEncounterType
      encounterId: string
      fieldValues: Record<string, unknown>
      attachments?: ReportAttachment[]
      language?: 'en' | 'ar'
    }) => {
      const res = await fetch('/api/document-reports/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...spaceHeaders(space) },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to generate report')
      }
      return res.json() as Promise<{ report: DocumentReportInstance }>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  })
}

export function useUpdateReportInstance() {
  const qc = useQueryClient()
  const { space } = useParams<{ space?: string }>()
  return useMutation({
    mutationFn: async (vars: { id: string; patch: { fieldValues?: Record<string, unknown>; attachments?: ReportAttachment[]; language?: 'en' | 'ar' } }) => {
      const res = await fetch(`/api/document-reports/instances/${vars.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...spaceHeaders(space) },
        body: JSON.stringify(vars.patch),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to update report')
      }
      return res.json() as Promise<{ report: DocumentReportInstance }>
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: LIST_KEY })
      qc.invalidateQueries({ queryKey: [...LIST_KEY, space, vars.id] })
    },
  })
}
