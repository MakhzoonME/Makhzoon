'use client'

import { useMutation } from '@tanstack/react-query'
import type { HarakaServiceVehicle } from '@/types'

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
