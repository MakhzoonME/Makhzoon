import { supabaseAdmin } from '@/lib/supabase/admin';
import { MaintenanceRecord } from '@/types';

type Row = Record<string, unknown>;

function toRecord(r: Row): MaintenanceRecord {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    assetId: r.asset_id as string,
    type: r.type as string,
    description: r.description as string,
    performedBy: r.performed_by as string,
    cost: r.cost as number,
    date: r.date ? new Date(r.date as string) : new Date(),
    createdBy: r.created_by as string,
    createdByEmail: r.created_by_email as string,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
  };
}

export async function getMaintenanceRecords(
  orgId: string,
  assetId?: string,
): Promise<MaintenanceRecord[]> {
  let q = supabaseAdmin
    .from('maintenance_records')
    .select('*')
    .eq('organization_id', orgId)
    .order('date', { ascending: false });
  if (assetId) q = q.eq('asset_id', assetId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(toRecord);
}

export async function getMaintenanceRecordById(
  id: string,
): Promise<MaintenanceRecord | null> {
  const { data } = await supabaseAdmin
    .from('maintenance_records')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data ? toRecord(data) : null;
}

export async function createMaintenanceRecord(
  data: Omit<MaintenanceRecord, 'id' | 'createdAt'>,
): Promise<string> {
  const { data: row, error } = await supabaseAdmin
    .from('maintenance_records')
    .insert({
      organization_id: data.organizationId,
      asset_id: data.assetId,
      type: data.type,
      description: data.description,
      performed_by: data.performedBy,
      cost: data.cost,
      date: new Date(data.date).toISOString(),
      created_by: data.createdBy,
      created_by_email: data.createdByEmail,
    })
    .select('id')
    .single();
  if (error) throw error;
  return row.id as string;
}

export async function deleteMaintenanceRecord(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('maintenance_records')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
