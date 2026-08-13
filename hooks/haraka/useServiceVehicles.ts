'use client'

import { useMutation } from '@tanstack/react-query'
import type { HarakaServiceVehicle } from '@/types'
import { recognizePlateClientSide } from '@/lib/modules/haraka/service-vehicles/plate-ocr-client'

// Runs entirely in the browser (Tesseract.js/WASM) — no server round trip,
// no provider account or API key.
export function useOcrPlate() {
  return useMutation({
    mutationFn: (imageDataUri: string) => recognizePlateClientSide(imageDataUri),
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
