import 'server-only'

/**
 * Server-side proxy to the plate-OCR provider (FastPlateOCR by default).
 * Never called from the client directly — the API key lives only here,
 * loaded from the org's encrypted haraka_service_notification_config row.
 */

export interface PlateOcrResult {
  plateNumber: string | null
  confidence: number | null
}

const FASTPLATEOCR_ENDPOINT = 'https://api.fastplateocr.com/v1/plate-recognition'

export async function recognizePlate(
  apiKey: string,
  image: { dataUri?: string; imageUrl?: string },
): Promise<PlateOcrResult> {
  const res = await fetch(FASTPLATEOCR_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      image.dataUri ? { image_base64: image.dataUri } : { image_url: image.imageUrl },
    ),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error ?? `Plate OCR failed (${res.status})`)
  }
  const json = await res.json()
  const best = Array.isArray(json?.results) ? json.results[0] : json
  return {
    plateNumber: best?.plate?.toUpperCase() ?? null,
    confidence:  typeof best?.confidence === 'number' ? best.confidence : null,
  }
}
