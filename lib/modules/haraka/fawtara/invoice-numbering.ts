import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

/**
 * Allocate the next sequential Fawtara invoice number per organization,
 * inside a Firestore transaction so concurrent sales never collide.
 *
 * Format: `INV-${year}-${seq6}` where year is the calendar year of issuance.
 * Counter resets on year boundary — this matches Jordan ISTD's expectation
 * that invoice numbering can be year-scoped per taxpayer.
 */
export async function allocateFawtaraInvoiceNumber(orgId: string, year: number): Promise<{ invoiceNumber: string; sequence: number }> {
  const ref = adminDb.collection('fawtaraCounters').doc(orgId)
  return adminDb.runTransaction(async (t) => {
    const doc = await t.get(ref)
    const data = doc.exists ? doc.data()! : {}
    const sameYear = data.year === year
    const next = sameYear ? Number(data.lastSequence ?? 0) + 1 : 1
    t.set(ref, {
      organizationId: orgId,
      year,
      lastSequence: next,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
    return {
      invoiceNumber: `INV-${year}-${String(next).padStart(6, '0')}`,
      sequence: next,
    }
  })
}
