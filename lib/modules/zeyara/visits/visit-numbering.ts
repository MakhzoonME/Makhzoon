import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Row = Record<string, unknown>

/** Next sequential visit number for an (org, space). Format: VST-NNNNNN.
 *  Same counter shape as allocateAppointmentNumber. */
export async function allocateVisitNumber(
  orgId: string,
  spaceId?: string | null,
): Promise<string> {
  const sid = spaceId ?? ''
  const { data } = await supabaseAdmin
    .from('zeyara_visit_counters')
    .select('last_visit_number')
    .eq('organization_id', orgId)
    .eq('space_id', sid)
    .maybeSingle()

  const next = (data ? Number((data as unknown as Row).last_visit_number ?? 0) : 0) + 1

  await supabaseAdmin
    .from('zeyara_visit_counters')
    .upsert(
      {
        organization_id: orgId,
        space_id: sid,
        last_visit_number: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id,space_id' },
    )

  return `VST-${String(next).padStart(6, '0')}`
}
