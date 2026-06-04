import { supabaseAdmin } from '@/lib/supabase/admin';

/** Allocate the next sequential invoice number for an org (per calendar year).
 *  Format: INV-YYYY-NNNNNN  e.g. INV-2026-000001
 *  Read-modify-write is acceptable for typical invoice volumes; harden to a
 *  DB function if concurrent allocation becomes a concern. */
export async function allocateHarakaInvoiceNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear();

  const { data: existing } = await supabaseAdmin
    .from('haraka_invoice_counters')
    .select('last_sequence')
    .eq('organization_id', orgId)
    .eq('year', year)
    .maybeSingle();

  const next = Number(existing?.last_sequence ?? 0) + 1;

  await supabaseAdmin
    .from('haraka_invoice_counters')
    .upsert(
      { organization_id: orgId, year, last_sequence: next, updated_at: new Date().toISOString() },
      { onConflict: 'organization_id,year' },
    );

  return `INV-${year}-${String(next).padStart(6, '0')}`;
}
