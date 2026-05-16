import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Allocate the next sequential Fawtara invoice number per organization.
 * Format: `INV-${year}-${seq6}`; the counter resets on a year boundary
 * (matches Jordan ISTD year-scoped numbering).
 *
 * NOTE: the Firestore version used a transaction. This is read-modify-write
 * on the single fawtara_counters row — acceptable for the internal/staging
 * scope. Harden via a Postgres SECURITY DEFINER RPC (atomic upsert returning
 * the incremented sequence) if concurrent invoicing becomes real.
 */
export async function allocateFawtaraInvoiceNumber(
  orgId: string,
  year: number,
): Promise<{ invoiceNumber: string; sequence: number }> {
  const { data: existing } = await supabaseAdmin
    .from('fawtara_counters')
    .select('year, last_sequence')
    .eq('organization_id', orgId)
    .maybeSingle()

  const sameYear = existing?.year === year
  const next = sameYear ? Number(existing?.last_sequence ?? 0) + 1 : 1

  const { error } = await supabaseAdmin.from('fawtara_counters').upsert(
    {
      organization_id: orgId,
      year,
      last_sequence: next,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id' },
  )
  if (error) throw error

  return {
    invoiceNumber: `INV-${year}-${String(next).padStart(6, '0')}`,
    sequence: next,
  }
}
