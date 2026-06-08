import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { InventoryAudit, InventoryAuditItem } from '@/types';

type Row = Record<string, unknown>;

function toAudit(r: Row): InventoryAudit {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    title: r.title as string,
    status: r.status as InventoryAudit['status'],
    notes: r.notes as string,
    totalAssets: (r.total_assets as number) ?? 0,
    foundCount: (r.found_count as number) ?? 0,
    missingCount: (r.missing_count as number) ?? 0,
    pendingCount: (r.pending_count as number) ?? 0,
    startedBy: r.started_by as string,
    startedByName: r.started_by_name as string,
    completedAt: r.completed_at
      ? new Date(r.completed_at as string)
      : undefined,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
  };
}

function toAuditItem(r: Row): InventoryAuditItem {
  return {
    id: r.id as string,
    auditId: r.audit_id as string,
    organizationId: r.organization_id as string,
    assetId: r.asset_id as string,
    assetName: r.asset_name as string,
    assetCategory: r.asset_category as string,
    assetSerial: r.asset_serial as string,
    assetLocation: r.asset_location as string,
    assetAssignedTo: r.asset_assigned_to as string,
    status: r.status as InventoryAuditItem['status'],
    note: r.note as string,
    checkedAt: r.checked_at ? new Date(r.checked_at as string) : undefined,
    checkedBy: r.checked_by as string,
    checkedByName: r.checked_by_name as string,
  };
}

export async function getInventoryAudits(
  orgId: string,
  spaceId?: string,
): Promise<InventoryAudit[]> {
  let q = supabaseAdmin
    .from('inventory_audits')
    .select('*')
    .eq('organization_id', orgId);
  if (spaceId) q = q.eq('space_id', spaceId);
  const { data, error } = await q
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map(toAudit);
}

export async function getInventoryAuditById(
  id: string,
): Promise<InventoryAudit | null> {
  const { data } = await supabaseAdmin
    .from('inventory_audits')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data ? toAudit(data) : null;
}

export async function createInventoryAudit(data: {
  organizationId: string;
  spaceId?: string;
  title: string;
  notes?: string;
  startedBy: string;
  startedByName?: string;
  assets: Array<{
    id: string;
    name: string;
    category: string;
    serialNumber?: string;
    location?: string;
    assignedTo?: string;
  }>;
}): Promise<string> {
  const total = data.assets.length;
  const { data: audit, error } = await supabaseAdmin
    .from('inventory_audits')
    .insert({
      organization_id: data.organizationId,
      space_id: data.spaceId,
      title: data.title,
      notes: data.notes ?? null,
      status: 'in_progress',
      total_assets: total,
      found_count: 0,
      missing_count: 0,
      pending_count: total,
      started_by: data.startedBy,
      started_by_name: data.startedByName ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;
  const auditId = audit.id as string;

  if (total > 0) {
    const items = data.assets.map((a) => ({
      audit_id: auditId,
      organization_id: data.organizationId,
      space_id: data.spaceId,
      asset_id: a.id,
      asset_name: a.name,
      asset_category: a.category,
      asset_serial: a.serialNumber ?? null,
      asset_location: a.location ?? null,
      asset_assigned_to: a.assignedTo ?? null,
      status: 'pending',
      note: null,
      checked_at: null,
      checked_by: null,
      checked_by_name: null,
    }));
    const { error: itemsErr } = await supabaseAdmin
      .from('inventory_audit_items')
      .insert(items);
    if (itemsErr) throw itemsErr;
  }

  return auditId;
}

export async function getAuditItems(
  auditId: string,
): Promise<InventoryAuditItem[]> {
  const { data, error } = await supabaseAdmin
    .from('inventory_audit_items')
    .select('*')
    .eq('audit_id', auditId)
    .order('asset_name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toAuditItem);
}

export async function updateAuditItem(
  auditItemId: string,
  auditId: string,
  status: 'found' | 'missing',
  actor: { uid: string; displayName?: string },
  note?: string,
): Promise<void> {
  // NOTE: was a Firestore multi-doc transaction. Read-modify-write here;
  // acceptable for the internal/staging scope. Harden via an RPC later.
  const [{ data: item }, { data: audit }] = await Promise.all([
    supabaseAdmin
      .from('inventory_audit_items')
      .select('status')
      .eq('id', auditItemId)
      .maybeSingle(),
    supabaseAdmin
      .from('inventory_audits')
      .select('found_count, missing_count, pending_count')
      .eq('id', auditId)
      .maybeSingle(),
  ]);
  if (!item || !audit) throw new Error('Not found');

  const prevStatus = item.status as string;
  const delta = { found: 0, missing: 0, pending: 0 };
  if (prevStatus === 'pending') delta.pending = -1;
  else if (prevStatus === 'found') delta.found = -1;
  else if (prevStatus === 'missing') delta.missing = -1;
  if (status === 'found') delta.found += 1;
  else delta.missing += 1;

  const { error: itemErr } = await supabaseAdmin
    .from('inventory_audit_items')
    .update({
      status,
      note: note ?? null,
      checked_at: new Date().toISOString(),
      checked_by: actor.uid,
      checked_by_name: actor.displayName ?? null,
    })
    .eq('id', auditItemId);
  if (itemErr) throw itemErr;

  const newFound = ((audit.found_count as number) ?? 0) + delta.found;
  const newMissing = ((audit.missing_count as number) ?? 0) + delta.missing;
  const newPending = ((audit.pending_count as number) ?? 0) + delta.pending;
  const allChecked = newPending === 0;

  const { error: auditErr } = await supabaseAdmin
    .from('inventory_audits')
    .update({
      found_count: newFound,
      missing_count: newMissing,
      pending_count: newPending,
      ...(allChecked
        ? { status: 'completed', completed_at: new Date().toISOString() }
        : {}),
    })
    .eq('id', auditId);
  if (auditErr) throw auditErr;
}

export async function completeAudit(auditId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('inventory_audits')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', auditId);
  if (error) throw error;
}
