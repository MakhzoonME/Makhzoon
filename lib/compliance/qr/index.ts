/**
 * Server-side QR code provider interface. No implementation here — adapters
 * provide their own QR generation via `ComplianceAdapter.generateQRCode`.
 *
 * The POS receipt currently renders QR codes via the existing `lib/qr.ts`.
 * That path is NOT routed through this interface yet; this is the seam for
 * a future swap.
 */

import type { CanonicalInvoice } from '../contracts/canonical-invoice'
import type { QRResult } from '../contracts/adapter'

export interface QRProvider {
  generate(invoice: CanonicalInvoice): QRResult
}
