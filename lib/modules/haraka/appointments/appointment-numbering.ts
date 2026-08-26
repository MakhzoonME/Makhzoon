import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Row = Record<string, unknown>

/** Next sequential appointment number for an (org, space). Format: APT-NNNNNN. */
export async function allocateAppointmentNumber(
  orgId: string,
  spaceId?: string | null,
): Promise<string> {
  const sid = spaceId ?? ''
  const { data } = await supabaseAdmin
    .from('haraka_appointment_counters')
    .select('last_appointment_number')
    .eq('organization_id', orgId)
    .eq('space_id', sid)
    .maybeSingle()

  const next = (data ? Number((data as unknown as Row).last_appointment_number ?? 0) : 0) + 1

  await supabaseAdmin
    .from('haraka_appointment_counters')
    .upsert(
      {
        organization_id: orgId,
        space_id: sid,
        last_appointment_number: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id,space_id' },
    )

  return `APT-${String(next).padStart(6, '0')}`
}

/** Next appointment invoice number for an org, restarting each calendar year.
 *  Format: APT-INV-YYYY-NNNNNN. */
export async function allocateAppointmentInvoiceNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear()

  const { data: existing } = await supabaseAdmin
    .from('haraka_appointment_invoice_counters')
    .select('last_sequence')
    .eq('organization_id', orgId)
    .eq('year', year)
    .maybeSingle()

  const next = Number((existing as unknown as Row | null)?.last_sequence ?? 0) + 1

  await supabaseAdmin
    .from('haraka_appointment_invoice_counters')
    .upsert(
      { organization_id: orgId, year, last_sequence: next, updated_at: new Date().toISOString() },
      { onConflict: 'organization_id,year' },
    )

  return `APT-INV-${year}-${String(next).padStart(6, '0')}`
}
