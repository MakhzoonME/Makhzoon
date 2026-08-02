import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Allocate the next sequential Fawtara invoice number per organization.
 * Format: `INV-${year}-${seq6}`; the counter resets on a year boundary
 * (matches Jordan ISTD year-scoped numbering).
 *
 * Uses the atomic `next_fawtara_sequence` RPC (migration 0047) which
 * performs INSERT … ON CONFLICT DO UPDATE in a single statement, preventing
 * duplicate sequences from concurrent invoicing.
 */
export async function allocateFawtaraInvoiceNumber(
  orgId: string,
  year: number,
): Promise<{ invoiceNumber: string; sequence: number }> {
  const { data, error } = await supabaseAdmin.rpc('next_fawtara_sequence', {
    p_org_id: orgId,
    p_year: year,
  })
  if (error) throw error

  const next = Number(data)
  return {
    invoiceNumber: `INV-${year}-${String(next).padStart(6, '0')}`,
    sequence: next,
  }
}
