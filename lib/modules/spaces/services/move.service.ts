import 'server-only';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { TenantContext } from '@/lib/platform/tenancy/types';
import { auditLog } from '@/lib/platform/audit';
import {
  isPlatformAdmin,
  isOrgManager,
  assertCanCrossSpaces,
  loadTargetSpace,
  type MoveResult,
} from './move.helpers';

// Quantity-transfer (split-move) lives in its own module; re-exported so the
// `import * as moveService` namespace in the route keeps every entry point.
export { transferInventoryQuantity, type TransferResult } from './transfer-quantity.service';
export type { MoveResult };

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


/* ── Requests ──────────────────────────────────────────────────── */

/**
 * Move one or more requests to a target space.
 *
 * A request references either an asset (`asset_id`) or an inventory item
 * (`inventory_item_id`). Because those resources are themselves
 * space-scoped, we refuse to move a request to a target where its
 * referenced resource doesn't exist — the user must move the asset/item
 * first (or pick a different target). This keeps the request's
 * reference valid and visible from the destination space.
 */
export async function moveRequests(
  tenant: TenantContext,
  requestIds: string[],
  targetSpaceId: string,
): Promise<MoveResult> {
  if (!isOrgManager(tenant) && !isPlatformAdmin(tenant)) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (requestIds.length === 0) return { moved: 0 };

  const target = await loadTargetSpace(tenant, targetSpaceId);

  const { data: rows } = await supabaseAdmin
    .from('requests')
    .select('id, organization_id, space_id, asset_id, inventory_item_id, type, description')
    .in('id', requestIds);
  type RequestRow = {
    id: string; organization_id: string; space_id: string;
    asset_id: string | null; inventory_item_id: string | null;
    type: string; description: string | null;
  };
  const requests = (rows ?? []) as RequestRow[];
  if (requests.length !== requestIds.length || requests.some((r) => r.organization_id !== tenant.organizationId)) {
    throw NextResponse.json({ error: 'One or more requests not found' }, { status: 404 });
  }

  // Permission: caller must access every source space + the target.
  const sources = [...new Set(requests.map((r) => r.space_id))];
  for (const src of sources) {
    await assertCanCrossSpaces(tenant, src, target.id);
  }

  const toMove = requests.filter((r) => r.space_id !== target.id);
  if (toMove.length === 0) return { moved: 0 };

  // Validate referenced asset/item is already in the target space.
  // We bulk-check by collecting all referenced ids and querying once.
  const assetIds = toMove.map((r) => r.asset_id).filter((x): x is string => !!x);
  const itemIds = toMove.map((r) => r.inventory_item_id).filter((x): x is string => !!x);

  let assetsInTarget = new Set<string>();
  let itemsInTarget = new Set<string>();
  if (assetIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('assets')
      .select('id')
      .eq('organization_id', tenant.organizationId)
      .eq('space_id', target.id)
      .in('id', assetIds);
    assetsInTarget = new Set((data ?? []).map((r) => r.id as string));
  }
  if (itemIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('inventory_items')
      .select('id')
      .eq('organization_id', tenant.organizationId)
      .eq('space_id', target.id)
      .in('id', itemIds);
    itemsInTarget = new Set((data ?? []).map((r) => r.id as string));
  }

  const blockers = toMove.filter((r) =>
    (r.asset_id && !assetsInTarget.has(r.asset_id)) ||
    (r.inventory_item_id && !itemsInTarget.has(r.inventory_item_id)),
  );
  if (blockers.length > 0) {
    throw NextResponse.json(
      {
        error: `Cannot move ${blockers.length} request(s): the referenced asset or item is not in ${target.name}. Move it first.`,
      },
      { status: 409 },
    );
  }

  // 1. Move requests.
  const ids = toMove.map((r) => r.id);
  const { error: uErr } = await supabaseAdmin
    .from('requests')
    .update({ space_id: target.id, updated_by: tenant.userId })
    .in('id', ids);
  if (uErr) throw uErr;

  // 2. Audit log per request.
  for (const r of toMove) {
    auditLog.queue({
      tenant,
      module: 'spaces',
      action: 'REQUEST_SUBMITTED', // closest existing action; new value records the move
      recordId: r.id,
      oldValue: { space_id: r.space_id, type: r.type, kind: 'move' },
      newValue: { space_id: target.id, target_name: target.name },
    });
  }

  return { moved: toMove.length };
}


/* ── POS Customers ─────────────────────────────────────────────── */

/**
 * Move one or more POS customers to a target space.
 *
 * Customers are a simple reassign — historical pos_transactions stay in
 * the space where they happened (POS history is immutable). The
 * customer record itself follows the move; future sales will use the
 * customer in their new space.
 */
export async function moveCustomers(
  tenant: TenantContext,
  customerIds: string[],
  targetSpaceId: string,
): Promise<MoveResult> {
  if (!isOrgManager(tenant) && !isPlatformAdmin(tenant)) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (customerIds.length === 0) return { moved: 0 };

  const target = await loadTargetSpace(tenant, targetSpaceId);

  const { data: rows } = await supabaseAdmin
    .from('pos_customers')
    .select('id, organization_id, space_id, name')
    .in('id', customerIds);
  type CustomerRow = { id: string; organization_id: string; space_id: string; name: string };
  const customers = (rows ?? []) as CustomerRow[];
  if (customers.length !== customerIds.length || customers.some((c) => c.organization_id !== tenant.organizationId)) {
    throw NextResponse.json({ error: 'One or more customers not found' }, { status: 404 });
  }

  const sources = [...new Set(customers.map((c) => c.space_id))];
  for (const src of sources) {
    await assertCanCrossSpaces(tenant, src, target.id);
  }

  const toMove = customers.filter((c) => c.space_id !== target.id);
  if (toMove.length === 0) return { moved: 0 };
  const ids = toMove.map((c) => c.id);

  const { error: uErr } = await supabaseAdmin
    .from('pos_customers')
    .update({ space_id: target.id, updated_by: tenant.userId })
    .in('id', ids);
  if (uErr) throw uErr;

  for (const c of toMove) {
    auditLog.queue({
      tenant,
      module: 'spaces',
      action: 'POS_CUSTOMER_UPDATED',
      recordId: c.id,
      oldValue: { space_id: c.space_id, kind: 'move' },
      newValue: { space_id: target.id, target_name: target.name, name: c.name },
    });
  }

  return { moved: toMove.length };
}
