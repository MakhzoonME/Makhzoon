import { supabaseAdmin } from '@/lib/supabase/admin';
import { AssetCheckout } from '@/types';

type Row = Record<string, unknown>;

function toCheckout(r: Row): AssetCheckout {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    assetId: r.asset_id as string,
    checkedOutTo: r.checked_out_to as string,
    checkedOutBy: r.checked_out_by as string,
    checkedOutByEmail: r.checked_out_by_email as string,
    dueDate: r.due_date ? new Date(r.due_date as string) : undefined,
    notes: r.notes as string,
    checkedOutAt: r.checked_out_at
      ? new Date(r.checked_out_at as string)
      : new Date(),
    returnedAt: r.returned_at ? new Date(r.returned_at as string) : undefined,
    returnedBy: r.returned_by as string,
    returnedByEmail: r.returned_by_email as string,
  };
}

export async function getCheckouts(
  orgId: string,
  opts?: { assetId?: string; activeOnly?: boolean },
): Promise<AssetCheckout[]> {
  let q = supabaseAdmin
    .from('asset_checkouts')
    .select('*')
    .eq('organization_id', orgId)
    .order('checked_out_at', { ascending: false });
  if (opts?.assetId) q = q.eq('asset_id', opts.assetId);
  if (opts?.activeOnly) q = q.is('returned_at', null);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(toCheckout);
}

export async function getActiveCheckoutForAsset(
  orgId: string,
  assetId: string,
): Promise<AssetCheckout | null> {
  const { data } = await supabaseAdmin
    .from('asset_checkouts')
    .select('*')
    .eq('organization_id', orgId)
    .eq('asset_id', assetId)
    .order('checked_out_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const c = toCheckout(data);
  return c.returnedAt ? null : c;
}

export async function getCheckoutById(
  id: string,
): Promise<AssetCheckout | null> {
  const { data } = await supabaseAdmin
    .from('asset_checkouts')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data ? toCheckout(data) : null;
}

export async function createCheckout(
  data: Omit<
    AssetCheckout,
    'id' | 'checkedOutAt' | 'returnedAt' | 'returnedBy' | 'returnedByEmail'
  >,
): Promise<string> {
  const { data: row, error } = await supabaseAdmin
    .from('asset_checkouts')
    .insert({
      organization_id: data.organizationId,
      asset_id: data.assetId,
      checked_out_to: data.checkedOutTo,
      checked_out_by: data.checkedOutBy,
      checked_out_by_email: data.checkedOutByEmail,
      due_date: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      notes: data.notes,
      returned_at: null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return row.id as string;
}

export async function markReturned(
  id: string,
  params: { returnedBy: string; returnedByEmail: string },
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('asset_checkouts')
    .update({
      returned_at: new Date().toISOString(),
      returned_by: params.returnedBy,
      returned_by_email: params.returnedByEmail,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function countActiveCheckouts(orgId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('asset_checkouts')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .is('returned_at', null);
  if (error) throw error;
  return count ?? 0;
}
