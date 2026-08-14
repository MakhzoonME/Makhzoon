'use client'

import { createWorker, type Worker } from 'tesseract.js'

/**
 * Fully client-side plate OCR — runs in the browser via Tesseract.js (WASM),
 * no external account, API key, or per-request cost. Replaces the old
 * FastPlateOCR server proxy, which required a paid provider account and
 * stopped working.
 *
 * Regional plates (Jordan, Syria, Iraq, KSA, UAE, Qatar, Kuwait, …) mostly
 * encode the actual plate identifier in Latin digits/letters even when
 * surrounded by Arabic country text — so English is the primary model. Arabic
 * is loaded alongside it only to catch Arabic-indic digits (٠-٩), which a few
 * countries (Iraq, KSA) print instead of or next to the Latin ones; those get
 * normalized back to Latin digits below. Plates whose identifier itself is
 * pure Arabic script (e.g. Iraqi "خصوصي" specialty plates) are a much harder
 * cursive-recognition problem and will likely need manual entry as a fallback.
 */

export interface PlateOcrResult {
  plateNumber: string | null
  confidence: number | null
}

let workerPromise: Promise<Worker> | null = null

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker('eng+ara').then(async (worker) => {
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789٠١٢٣٤٥٦٧٨٩- ',
      })
      return worker
    })
  }
  return workerPromise
}

// Arabic-indic digits → Latin digits, so the same physical plate always
// normalizes to one stored form regardless of which script the OCR read.
const ARABIC_INDIC_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
}

function extractPlate(rawText: string): string | null {
  const normalized = rawText.replace(/[٠-٩]/g, (d) => ARABIC_INDIC_DIGITS[d] ?? d)
  const cleaned = normalized.toUpperCase().replace(/[^A-Z0-9]/g, '')
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
