'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import type { HarakaService } from '@/types'
import type { CreateServicePayload, UpdateServicePayload } from '@/lib/modules/haraka/services/schemas'

const LIST_KEY = ['haraka', 'services'] as const

function spaceHeaders(space?: string): HeadersInit {
  return space ? { 'x-space-slug': space } : {}
}

export interface UseServicesParams {
  search?:   string
  active?:   boolean
  category?: string
  page?:     number
  pageSize?: number
}

interface ListResp {
  items:      HarakaService[]
  total:      number
  page:       number
  pageSize:   number
  totalPages: number
}

export function useServices(params?: UseServicesParams) {
  const { space } = useParams<{ space?: string }>()
  const query = new URLSearchParams()
  if (params?.search)   query.set('search', params.search)
  if (params?.active !== undefined) query.set('active', String(params.active))
  if (params?.category) query.set('category', params.category)
  if (params?.page)     query.set('page', String(params.page))
  if (params?.pageSize) query.set('pageSize', String(params.pageSize))
  return useQuery<ListResp>({
    queryKey: [...LIST_KEY, space, params],
    enabled:  !!space,
    queryFn:  async () => {
      // no-store: the API response carries a Cache-Control header for
      // proxy/CDN caching, but the browser's own HTTP cache would otherwise
      // serve a stale list to this identical URL after a create/update
      // mutation invalidates the query — react-query's own staleTime above
      // already covers client-side caching between renders.
      const res = await fetch(`/api/haraka/services?${query.toString()}`, { headers: spaceHeaders(space), cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch services')
      return res.json()
    },
    staleTime: 15_000,
  })
}

export function useServiceCategories() {
  const { space } = useParams<{ space?: string }>()
  return useQuery<string[]>({
    queryKey: ['haraka', 'service-categories', space],
    enabled:  !!space,
    queryFn:  async () => {
      const res = await fetch('/api/haraka/services?categoriesOnly=true', { headers: spaceHeaders(space), cache: 'no-store' })
      if (!res.ok) return []
      const data = await res.json()
      return data.categories ?? []
    },
    staleTime: 15_000,
  })
}

export function useService(id: string | undefined) {
  const { space } = useParams<{ space?: string }>()
  return useQuery<{ service: HarakaService }>({
    queryKey: ['haraka', 'services', space, id],
    enabled:  !!id && !!space,
    queryFn:  async () => {
      const res = await fetch(`/api/haraka/services/${id}`, { headers: spaceHeaders(space) })
      if (!res.ok) throw new Error('Failed to fetch service')
      return res.json()
    },
  })
}

export function useCreateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateServicePayload) => {
      const res = await fetch('/api/haraka/services', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to create service')
      }
      return res.json() as Promise<{ service: HarakaService }>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  })
}

export function useUpdateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { id: string; body: UpdateServicePayload }) => {
      const res = await fetch(`/api/haraka/services/${vars.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(vars.body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to update service')
      }
      return res.json() as Promise<{ service: HarakaService }>
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: LIST_KEY })
      qc.invalidateQueries({ queryKey: ['haraka', 'services', undefined, vars.id] })
    },
  })
}

export function useDeleteService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/haraka/services/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to delete service')
      }
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  })
}
