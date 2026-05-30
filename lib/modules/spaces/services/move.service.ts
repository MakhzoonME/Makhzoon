import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { TenantContext } from '@/lib/platform/tenancy/types';
import { auditLog } from '@/lib/platform/audit';

const PLATFORM_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);
const MGR_ROLES = new Set(['org_owner', 'admin']);

function isPlatformAdmin(t: TenantContext) {
  return PLATFORM_ROLES.has(t.role);
}
function isOrgManager(t: TenantContext) {
  return MGR_ROLES.has(t.role);
}

/**
 * Check that the caller can access BOTH source and target spaces.
 *
 * Platform admins bypass. Owners with all_spaces=true bypass.
 * Otherwise we require explicit `space_members` rows for both spaces,
 * mirroring the can_access_space() SQL helper.
 */
async function assertCanCrossSpaces(
  tenant: TenantContext,
  sourceSpaceId: string,
  targetSpaceId: string,
): Promise<void> {
  if (isPlatformAdmin(tenant)) return;
  if (tenant.allSpaces) return;
  const accessible = new Set(tenant.accessibleSpaceIds ?? []);
  if (!accessible.has(sourceSpaceId)) {
    throw NextResponse.json({ error: 'No access to source space' }, { status: 403 });
  }
  if (!accessible.has(targetSpaceId)) {
    throw NextResponse.json({ error: 'No access to target space' }, { status: 403 });
  }
}

/** Resolve target space and verify it exists + same org + is active. */
async function loadTargetSpace(tenant: TenantContext, targetSpaceId: string) {
  const { data } = await supabaseAdmin
    .from('spaces')
    .select('id, organization_id, status, name')
    .eq('id', targetSpaceId)
    .maybeSingle();
  if (!data || data.organization_id !== tenant.organizationId) {
    throw NextResponse.json({ error: 'Target space not found' }, { status: 404 });
  }
  if (data.status !== 'active') {
    throw NextResponse.json({ error: 'Target space is archived' }, { status: 409 });
  }
  return data as { id: string; organization_id: string; status: string; name: string };
}

export interface MoveResult { moved: number }

/**
 * Move one or more assets to a target space. Cascades to the asset's
 * notes, maintenance records, checkouts, and warranties so the whole
 * asset history follows.
 */
export async function moveAssets(
  tenant: TenantContext,
  assetIds: string[],
  targetSpaceId: string,
): Promise<MoveResult> {
  if (!isOrgManager(tenant) && !isPlatformAdmin(tenant)) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (assetIds.length === 0) return { moved: 0 };

  const target = await loadTargetSpace(tenant, targetSpaceId);

  // Load assets + verify org + collect source space ids for permission check.
  const { data: assets } = await supabaseAdmin
    .from('assets')
    .select('id, organization_id, space_id, name')
    .in('id', assetIds);
  type AssetRow = { id: string; organization_id: string; space_id: string; name: string };
  const rows = (assets ?? []) as AssetRow[];
  if (rows.length !== assetIds.length || rows.some((r) => r.organization_id !== tenant.organizationId)) {
    throw NextResponse.json({ error: 'One or more assets not found' }, { status: 404 });
  }

  // Permission: caller must access every source space + the target.
  const sources = [...new Set(rows.map((r) => r.space_id))];
  for (const src of sources) {
    await assertCanCrossSpaces(tenant, src, target.id);
  }

  // Skip no-ops (already in target). We still report them as "moved"
  // for caller simplicity but they don't generate audit rows.
  const toMove = rows.filter((r) => r.space_id !== target.id);
  if (toMove.length === 0) return { moved: 0 };
  const toMoveIds = toMove.map((r) => r.id);

  // 1. Move the assets themselves.
  const { error: aErr } = await supabaseAdmin
    .from('assets')
    .update({ space_id: target.id, updated_by: tenant.userId })
    .in('id', toMoveIds);
  if (aErr) throw aErr;

  // 2. Cascade to dependents — each is keyed by asset_id.
  const dependents = ['asset_notes', 'asset_checkouts', 'maintenance_records', 'warranties'];
  for (const tbl of dependents) {
    const { error } = await supabaseAdmin
      .from(tbl)
      .update({ space_id: target.id })
      .in('asset_id', toMoveIds);
    if (error) throw error;
  }

  // 3. Audit log per asset.
  for (const r of toMove) {
    auditLog.queue({
      tenant,
      module: 'spaces',
      action: 'ASSET_UPDATED',
      recordId: r.id,
      oldValue: { space_id: r.space_id, type: 'move' },
      newValue: { space_id: target.id, target_name: target.name, name: r.name },
    });
  }

  return { moved: toMove.length };
}

/**
 * Move one or more inventory items to a target space (whole-item move).
 * The item's ledger (`inventory_transactions`) follows.
 *
 * Note: a future "transfer quantity" mode will split an item between
 * spaces via paired ledger rows; this PR ships whole-move only.
 */
export async function moveInventoryItems(
  tenant: TenantContext,
  itemIds: string[],
  targetSpaceId: string,
): Promise<MoveResult> {
  if (!isOrgManager(tenant) && !isPlatformAdmin(tenant)) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (itemIds.length === 0) return { moved: 0 };

  const target = await loadTargetSpace(tenant, targetSpaceId);

  const { data: items } = await supabaseAdmin
    .from('inventory_items')
    .select('id, organization_id, space_id, name, sku')
    .in('id', itemIds);
  type ItemRow = { id: string; organization_id: string; space_id: string; name: string; sku: string | null };
  const rows = (items ?? []) as ItemRow[];
  if (rows.length !== itemIds.length || rows.some((r) => r.organization_id !== tenant.organizationId)) {
    throw NextResponse.json({ error: 'One or more items not found' }, { status: 404 });
  }

  const sources = [...new Set(rows.map((r) => r.space_id))];
  for (const src of sources) {
    await assertCanCrossSpaces(tenant, src, target.id);
  }

  const toMove = rows.filter((r) => r.space_id !== target.id);
  if (toMove.length === 0) return { moved: 0 };
  const toMoveIds = toMove.map((r) => r.id);

  // Per-space SKU uniqueness (Script 3 enforces this at the DB level).
  // Detect collisions early for a friendly 409.
  const incomingSkus = toMove.map((r) => r.sku).filter((s): s is string => !!s && s.trim() !== '');
  if (incomingSkus.length > 0) {
    const { data: collisions } = await supabaseAdmin
      .from('inventory_items')
      .select('id, sku')
      .eq('organization_id', tenant.organizationId)
      .eq('space_id', target.id)
      .in('sku', incomingSkus);
    const blockingSkus = (collisions ?? [])
      .filter((c) => !toMoveIds.includes(c.id as string))
      .map((c) => c.sku as string);
    if (blockingSkus.length > 0) {
      throw NextResponse.json(
        { error: `SKU already exists in target space: ${blockingSkus.join(', ')}` },
        { status: 409 },
      );
    }
  }

  // 1. Move items.
  const { error: iErr } = await supabaseAdmin
    .from('inventory_items')
    .update({ space_id: target.id, updated_by: tenant.userId })
    .in('id', toMoveIds);
  if (iErr) throw iErr;

  // 2. Carry the ledger.
  const { error: tErr } = await supabaseAdmin
    .from('inventory_transactions')
    .update({ space_id: target.id })
    .in('item_id', toMoveIds);
  if (tErr) throw tErr;

  // 3. Audit log per item.
  for (const r of toMove) {
    auditLog.queue({
      tenant,
      module: 'spaces',
      action: 'INVENTORY_ITEM_UPDATED',
      recordId: r.id,
      oldValue: { space_id: r.space_id, type: 'move' },
      newValue: { space_id: target.id, target_name: target.name, name: r.name, sku: r.sku },
    });
  }

  return { moved: toMove.length };
}
