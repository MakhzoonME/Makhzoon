'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import type { HarakaServiceVehicle } from '@/types'

/** A customer's saved vehicles — the "pick from saved plates" list on New
 *  Service Job. Reads the same haraka_service_vehicles rows regardless of
 *  whether they were added via the customer profile's plate custom field or
 *  a previous job's inline capture, so both entry points stay consistent. */
export function useCustomerVehicles(customerId: string | null | undefined) {
  const { space } = useParams<{ space?: string }>()
  return useQuery<{ items: HarakaServiceVehicle[] }>({
    queryKey: ['haraka', 'service-vehicles', space, customerId],
    enabled: !!customerId && !!space,
    queryFn: async () => {
      const headers: HeadersInit = space ? { 'x-space-slug': space } : {}
      const res = await fetch(`/api/haraka/service-vehicles?customerId=${customerId}`, { headers })
      if (!res.ok) throw new Error('Failed to fetch vehicles')
      return res.json()
    },
    staleTime: 10_000,
  })
}

export function useOcrPlate() {
  return useMutation({
    mutationFn: async (imageDataUri: string) => {
      const res = await fetch('/api/haraka/service-vehicles/ocr', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ imageDataUri }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Plate recognition failed')
      }
      return res.json() as Promise<{
        plateNumber: string | null
        confidence: number | null
        candidates: { plate: string; score: number }[]
      }>
    },
  })
}

export function useFindOrCreateVehicle() {
  return useMutation({
    mutationFn: async (vars: { plateNumber: string; customerId?: string | null }) => {
      const res = await fetch('/api/haraka/service-vehicles', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(vars),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to save vehicle')
      }
      return res.json() as Promise<{ vehicle: HarakaServiceVehicle; isNew: boolean }>
    },
  })
}
