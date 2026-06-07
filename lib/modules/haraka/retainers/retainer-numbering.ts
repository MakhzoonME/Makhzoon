import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Row = Record<string, unknown>

export async function allocateRetainerNumber(orgId: string, spaceId?: string | null): Promise<string> {
  const sid = spaceId ?? ''
  const { data } = await supabaseAdmin
    .from('haraka_retainer_counters')
    .select('last_retainer_number')
    .eq('organization_id', orgId)
    .eq('space_id', sid)
    .maybeSingle()
  const next = (data ? Number((data as unknown as Row).last_retainer_number ?? 0) : 0) + 1
  await supabaseAdmin
    .from('haraka_retainer_counters')
    .upsert(
      { organization_id: orgId, space_id: sid, last_retainer_number: next },
      { onConflict: 'organization_id,space_id' },
    )
  return `RET-${String(next).padStart(6, '0')}`
}

export async function allocateRetainerInvoiceNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear()
  const { data: existing } = await supabaseAdmin
    .from('haraka_retainer_invoice_counters')
    .select('last_sequence')
    .eq('organization_id', orgId)
    .eq('year', year)
    .maybeSingle()
  const next = Number((existing as unknown as Row | null)?.last_sequence ?? 0) + 1
  await supabaseAdmin
    .from('haraka_retainer_invoice_counters')
    .upsert(
      { organization_id: orgId, year, last_sequence: next, updated_at: new Date().toISOString() },
      { onConflict: 'organization_id,year' },
    )
  return `RINV-${year}-${String(next).padStart(6, '0')}`
}
