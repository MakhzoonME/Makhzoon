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
    console.log('[plate-ocr] initializing worker (eng+ara) — fetches worker script, WASM engine, and language data from cdn.jsdelivr.net on first use')
    const startedAt = Date.now()
    workerPromise = createWorker('eng+ara').then(async (worker) => {
      console.log(`[plate-ocr] worker ready in ${Date.now() - startedAt}ms`)
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789٠١٢٣٤٥٦٧٨٩- ',
        // Deliberately left at the default AUTO page-segmentation mode.
        // SINGLE_COLUMN was tried to help stacked-line plates (Jordan's
        // truck-style prefix-over-main layout) but made single-line layouts
        // (Jordan's car-style "prefix · main", and most other countries)
        // produce total garbage — forcing one structural assumption doesn't
        // hold across plate shapes. AUTO is less specialized but far safer.
      })
      return worker
    }).catch((err) => {
      console.error('[plate-ocr] worker init failed', err)
      workerPromise = null // let the next capture attempt retry from scratch
      throw err
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

// Jordan plates pair a 1-2 digit prefix with a 1-5 digit main number,
// separated visually by a middle dot or gap ("10 · 23456") — sometimes on
// one line, sometimes stacked across two, with a small Arabic/English
// country-name label elsewhere on the plate that carries no digits and
// drops out on its own. Whatever the layout, Tesseract reports the prefix
// and main number as separate whitespace-delimited words (it can't read the
// dot itself, but it does see the gap), so tokenizing by any whitespace —
// not just line breaks — catches both layouts the same way. Reconstruct as
// "<prefix>-<main>" even when no dash is physically printed, matching how
// the number is written/searched everywhere else in the system.
function joinJordanPrefixMain(wordGroups: string[]): string | null {
  if (wordGroups.length !== 2) return null
  const [first, second] = wordGroups
  if (/^[0-9]{1,2}$/.test(first) && /^[0-9]{1,5}$/.test(second)) return `${first}-${second}`
  return null
}

// No real plate across any of these countries runs longer than this many
// identifying characters (prefix + main, dash excluded) — a longer result
// means the engine picked up border/frame/screw-hole noise as text, not a
// real read, so treat it as unrecognized rather than submit garbage.
const MAX_PLATE_CHARS = 10
// Tesseract's 0-100 word-confidence score. Below this, a "successful" read
// is more likely noise than a real plate — same reasoning as above.
const MIN_CONFIDENCE = 40

function extractPlate(rawText: string): string | null {
  const normalized = rawText.replace(/[٠-٩]/g, (d) => ARABIC_INDIC_DIGITS[d] ?? d)

  const wordGroups = normalized
    .split(/\s+/)
    .map((word) => word.toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .filter((word) => word.length > 0)

  const jordanFormat = joinJordanPrefixMain(wordGroups)
  if (jordanFormat) return jordanFormat

  const cleaned = wordGroups.join('')
  if (cleaned.length < 3 || cleaned.length > MAX_PLATE_CHARS) return null
  return cleaned
}

export async function recognizePlateClientSide(dataUri: string): Promise<PlateOcrResult> {
  console.log('[plate-ocr] recognize() starting, image size:', dataUri.length, 'bytes (base64)')
  const startedAt = Date.now()
  try {
    const worker = await getWorker()
    const { data } = await worker.recognize(dataUri)
    const confidence = typeof data.confidence === 'number' ? data.confidence : null
    const extracted = extractPlate(data.text)
    const plateNumber = confidence !== null && confidence < MIN_CONFIDENCE ? null : extracted
    console.log(`[plate-ocr] recognize() done in ${Date.now() - startedAt}ms — raw text: ${JSON.stringify(data.text)}, confidence: ${confidence}, extracted: ${extracted}, accepted: ${plateNumber}`)
    return { plateNumber, confidence }
  } catch (err) {
    console.error(`[plate-ocr] recognize() failed after ${Date.now() - startedAt}ms`, err)
    throw err
  }
}
