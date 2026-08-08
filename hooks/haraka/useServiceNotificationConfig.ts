'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import type { ServiceNotificationConfig } from '@/lib/modules/haraka/service-notifications/notification-config.repository'
import type { ServiceNotificationConfigPatch } from '@/lib/modules/haraka/service-notifications/schemas'

const CONFIG_KEY = ['haraka', 'service-notification-config'] as const

function spaceHeaders(space?: string): HeadersInit {
  return space ? { 'x-space-slug': space } : {}
}

export function useServiceNotificationConfig() {
  const { space } = useParams<{ space?: string }>()
  return useQuery<{ config: ServiceNotificationConfig | null }>({
    queryKey: [...CONFIG_KEY, space],
    enabled: !!space,
    queryFn: async () => {
      const res = await fetch('/api/haraka/service-notification-config', { headers: spaceHeaders(space) })
      if (!res.ok) throw new Error('Failed to fetch notification config')
      return res.json()
    },
    staleTime: 60_000,
  })
}

export function useUpdateServiceNotificationConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: ServiceNotificationConfigPatch) => {
      const res = await fetch('/api/haraka/service-notification-config', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to update config')
      }
      return res.json() as Promise<{ config: ServiceNotificationConfig }>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CONFIG_KEY }),
  })
}
