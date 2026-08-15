import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Per-org plate-OCR call log. Plate Recognizer's account usage is shared
 * across every organization (one global credential), so this is the only
 * place a per-org breakdown exists — used by Superadmin to see usage per
 * organization per month, not just the account-wide total.
 */

// Fire-and-forget — never let logging failure break the actual OCR response.
export function queueOcrUsageLog(organizationId: string, plateFound: boolean): void {
  supabaseAdmin
    .from('haraka_plate_ocr_usage_log')
    .insert({ organization_id: organizationId, plate_found: plateFound })
    .then(({ error }) => {
      if (error) console.error('[ocr-usage] failed to log usage', error)
    })
}

export interface OcrUsageByOrg {
  organizationId: string
  organizationName: string
  callsThisMonth: number
  callsTotal: number
}

export async function getOcrUsageByOrg(): Promise<OcrUsageByOrg[]> {
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  const [{ data: allRows }, { data: monthRows }] = await Promise.all([
    supabaseAdmin.from('haraka_plate_ocr_usage_log').select('organization_id'),
    supabaseAdmin.from('haraka_plate_ocr_usage_log').select('organization_id').gte('created_at', monthStart.toISOString()),
  ])

  const orgIds = new Set<string>()
  const totalByOrg = new Map<string, number>()
  const monthByOrg = new Map<string, number>()

  for (const r of allRows ?? []) {
    const id = r.organization_id as string
    orgIds.add(id)
    totalByOrg.set(id, (totalByOrg.get(id) ?? 0) + 1)
  }
  for (const r of monthRows ?? []) {
    const id = r.organization_id as string
    monthByOrg.set(id, (monthByOrg.get(id) ?? 0) + 1)
  }

  if (orgIds.size === 0) return []

  const { data: orgs } = await supabaseAdmin
    .from('organizations')
    .select('id, name')
    .in('id', Array.from(orgIds))

  const nameById = new Map((orgs ?? []).map((o) => [o.id as string, o.name as string]))

  return Array.from(orgIds)
    .map((id) => ({
      organizationId: id,
      organizationName: nameById.get(id) ?? 'Unknown org',
      callsThisMonth: monthByOrg.get(id) ?? 0,
      callsTotal: totalByOrg.get(id) ?? 0,
    }))
    .sort((a, b) => b.callsThisMonth - a.callsThisMonth)
}
