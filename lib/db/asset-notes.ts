import { supabaseAdmin } from '@/lib/supabase/admin';
import { AssetNote } from '@/types';

type Row = Record<string, unknown>;

function toNote(r: Row): AssetNote {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    assetId: r.asset_id as string,
    text: r.text as string,
    createdBy: r.created_by as string,
    createdByEmail: r.created_by_email as string,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
  };
}

export async function getAssetNotes(
  orgId: string,
  assetId: string,
): Promise<AssetNote[]> {
  const { data, error } = await supabaseAdmin
    .from('asset_notes')
    .select('*')
    .eq('organization_id', orgId)
    .eq('asset_id', assetId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toNote);
}

export async function createAssetNote(
  data: Omit<AssetNote, 'id' | 'createdAt'>,
): Promise<string> {
  const { data: row, error } = await supabaseAdmin
    .from('asset_notes')
    .insert({
      organization_id: data.organizationId,
      asset_id: data.assetId,
      text: data.text,
      created_by: data.createdBy,
      created_by_email: data.createdByEmail,
    })
    .select('id')
    .single();
  if (error) throw error;
  return row.id as string;
}

export async function getAssetNoteById(
  id: string,
): Promise<AssetNote | null> {
  const { data } = await supabaseAdmin
    .from('asset_notes')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data ? toNote(data) : null;
}

export async function deleteAssetNote(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('asset_notes')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
