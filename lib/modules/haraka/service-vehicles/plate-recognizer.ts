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

export interface PlateOcrResult {
  plateNumber: string | null
  confidence: number | null
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
    throw new Error(body?.detail ?? body?.error ?? `Plate OCR failed (${res.status})`)
  }
  const json = await res.json()
  const best = Array.isArray(json?.results) ? json.results[0] : null
  return {
    plateNumber: typeof best?.plate === 'string' ? best.plate.toUpperCase() : null,
    confidence:  typeof best?.score === 'number' ? best.score : null,
  }
}
