'use client'

import { createWorker, type Worker } from 'tesseract.js'

/**
 * Fully client-side plate OCR — runs in the browser via Tesseract.js (WASM),
 * no external account, API key, or per-request cost. Replaces the old
 * FastPlateOCR server proxy, which required a paid provider account and
 * stopped working.
 */

export interface PlateOcrResult {
  plateNumber: string | null
  confidence: number | null
}

let workerPromise: Promise<Worker> | null = null

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker('eng').then(async (worker) => {
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ',
      })
      return worker
    })
  }
  return workerPromise
}

function extractPlate(rawText: string): string | null {
  const cleaned = rawText.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return cleaned.length >= 3 ? cleaned : null
}

export async function recognizePlateClientSide(dataUri: string): Promise<PlateOcrResult> {
  const worker = await getWorker()
  const { data } = await worker.recognize(dataUri)
  return {
    plateNumber: extractPlate(data.text),
    confidence:  typeof data.confidence === 'number' ? data.confidence : null,
  }
}
