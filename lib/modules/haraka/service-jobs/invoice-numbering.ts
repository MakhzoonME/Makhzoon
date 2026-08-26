import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'

/** Allocate the next sequential service invoice number for an org (per calendar year).
 *  Format: SVI-YYYY-NNNNNN  e.g. SVI-2026-000001 */
export async function allocateServiceInvoiceNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear()

  const { data: existing } = await supabaseAdmin
    .from('haraka_service_invoice_counters')
    .select('last_sequence')
    .eq('organization_id', orgId)
    .eq('year', year)
    .maybeSingle()

  const next = Number(existing?.last_sequence ?? 0) + 1

  await supabaseAdmin
    .from('haraka_service_invoice_counters')
    .upsert(
      { organization_id: orgId, year, last_sequence: next, updated_at: new Date().toISOString() },
      { onConflict: 'organization_id,year' },
    )

  return `SVI-${year}-${String(next).padStart(6, '0')}`
}
