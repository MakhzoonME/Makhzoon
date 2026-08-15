import 'server-only'

/**
 * Server-side proxy to Plate Recognizer (platerecognizer.com) — a
 * purpose-built plate-recognition API, not generic OCR. Replaces the earlier
 * client-side Tesseract.js approach, which proved unreliable in production
 * testing (misreads, hallucinated text on noisy/watermarked images) since
 * it's a generic text engine with no notion of what a plate looks like.
 * The API key lives only here, loaded from the global encrypted
 * platform_notification_config row — never sent to the client.
 */

export interface PlateOcrCandidate {
  plate: string
  score: number
}

export interface PlateOcrResult {
  plateNumber: string | null
  confidence: number | null
  // Alternate readings ranked by confidence, for the UI to offer as a
  // quick-pick when the top guess looks wrong. Excludes the top pick itself.
  candidates: PlateOcrCandidate[]
}

/** Thrown when the account's monthly call quota is exhausted (HTTP 403). */
export class PlateOcrQuotaExceededError extends Error {
  constructor() {
    super('Monthly plate-recognition quota reached — this resets next month. Enter the plate number manually for now, or contact us to increase the limit.')
    this.name = 'PlateOcrQuotaExceededError'
  }
}

const PLATE_READER_ENDPOINT = 'https://api.platerecognizer.com/v1/plate-reader/'

function dataUriToBlob(dataUri: string): Blob {
  const [header, base64] = dataUri.split(',')
  const mime = /data:(.*);base64/.exec(header)?.[1] ?? 'image/jpeg'
  const bytes = Buffer.from(base64, 'base64')
  return new Blob([bytes], { type: mime })
}

export async function recognizePlate(
  apiKey: string,
  image: { dataUri?: string; imageUrl?: string },
): Promise<PlateOcrResult> {
  const form = new FormData()
  if (image.dataUri) {
    form.append('upload', dataUriToBlob(image.dataUri), 'plate.jpg')
  } else if (image.imageUrl) {
    form.append('upload_url', image.imageUrl)
  } else {
    throw new Error('Either dataUri or imageUrl is required')
  }

  const res = await fetch(PLATE_READER_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Token ${apiKey}` },
    body: form,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const message = String(body?.detail ?? body?.error ?? '')
    // Plate Recognizer returns 403 for both an exhausted call quota and
    // other authorization issues — checking the message content too avoids
    // mislabeling a real auth problem (e.g. a revoked token) as "out of quota".
    if (res.status === 403 && /quota|out of calls|limit/i.test(message)) {
      throw new PlateOcrQuotaExceededError()
    }
    throw new Error(message || `Plate OCR failed (${res.status})`)
  }
  const json = await res.json()

  if (typeof json?.usage?.calls === 'number' && typeof json?.usage?.max_calls === 'number') {
    console.log(`[plate-recognizer] usage: ${json.usage.calls}/${json.usage.max_calls} calls this period`)
  }

  const best = Array.isArray(json?.results) ? json.results[0] : null
  if (!best) return { plateNumber: null, confidence: null, candidates: [] }

  // Server-side sanity check only — never surfaced to the client. Lets us
  // spot-check in logs whether the detected country matches what's expected
  // (e.g. flags a plate read as "eg" when the org is in Jordan).
  if (best.region?.code) {
    console.log(`[plate-recognizer] detected region: ${best.region.code} (score: ${best.region.score})`)
  }

  const allCandidates: PlateOcrCandidate[] = Array.isArray(best.candidates)
    ? best.candidates
        .filter((c: unknown): c is { plate: string; score: number } =>
          !!c && typeof (c as { plate?: unknown }).plate === 'string' && typeof (c as { score?: unknown }).score === 'number')
        .map((c: { plate: string; score: number }) => ({ plate: c.plate.toUpperCase(), score: c.score }))
    : []

  const plateNumber = typeof best.plate === 'string' ? best.plate.toUpperCase() : null
  // candidates[] from the API includes the top pick itself — exclude it so
  // the UI only shows genuinely alternate readings.
  const candidates = allCandidates.filter((c) => c.plate !== plateNumber)

  return {
    plateNumber,
    confidence: typeof best.score === 'number' ? best.score : null,
    candidates,
  }
}
