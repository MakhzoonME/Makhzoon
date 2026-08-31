'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import type { DocumentReportTemplate, ReportFieldDef, ReportLanguageMode } from '@/types'

const LIST_KEY = ['document-reports', 'templates'] as const

function spaceHeaders(space?: string): HeadersInit {
  return space ? { 'x-space-slug': space } : {}
}

export function useReportTemplates(opts?: { activeOnly?: boolean }) {
  // Templates are org-scoped (document_report_templates has no space_id),
  // and /settings/reports isn't nested under [space] — so `space` is always
  // undefined there. Gating on it meant this query never ran on that page at
  // all, which is why a newly created template never showed up in the list.
  // `space` is still forwarded as an optional header where it happens to be
  // present (e.g. opened from within a space-scoped page).
  const { space } = useParams<{ space?: string }>()
  return useQuery<{ items: DocumentReportTemplate[] }>({
    queryKey: [...LIST_KEY, space, opts?.activeOnly],
    queryFn: async () => {
      const qs = opts?.activeOnly ? '?activeOnly=true' : ''
      const res = await fetch(`/api/document-reports/templates${qs}`, { headers: spaceHeaders(space) })
      if (!res.ok) throw new Error('Failed to fetch report templates')
      return res.json()
    },
    staleTime: 30_000,
  })
}

export function useReportTemplate(id: string | undefined) {
  const { space } = useParams<{ space?: string }>()
  return useQuery<{ template: DocumentReportTemplate }>({
    queryKey: [...LIST_KEY, space, id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/document-reports/templates/${id}`, { headers: spaceHeaders(space) })
      if (!res.ok) throw new Error('Failed to fetch report template')
      return res.json()
    },
  })
}

export function useCreateReportTemplate() {
  const qc = useQueryClient()
  const { space } = useParams<{ space?: string }>()
  return useMutation({
    mutationFn: async (body: { name: string; languageMode: ReportLanguageMode; fieldSchema: ReportFieldDef[] }) => {
      const res = await fetch('/api/document-reports/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...spaceHeaders(space) },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to create template')
      }
      return res.json() as Promise<{ template: DocumentReportTemplate }>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  })
}

export function useUpdateReportTemplate() {
  const qc = useQueryClient()
  const { space } = useParams<{ space?: string }>()
  return useMutation({
    mutationFn: async (vars: { id: string; patch: { name?: string; languageMode?: ReportLanguageMode; fieldSchema?: ReportFieldDef[]; isActive?: boolean } }) => {
      const res = await fetch(`/api/document-reports/templates/${vars.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...spaceHeaders(space) },
        body: JSON.stringify(vars.patch),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to update template')
      }
      return res.json() as Promise<{ template: DocumentReportTemplate }>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  })
}
