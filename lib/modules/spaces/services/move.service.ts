import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
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


/* ── Transfer quantity (paired ledger) ────────────────────────────── */

export interface TransferResult {
  moved: number; // always 1 for transfer-qty
  qty: number;
  sourceItemId: string;
  targetItemId: string;
  transferId: string;
}

/**
 * Transfer a quantity of an inventory item from its current space to a
 * target space. Unlike `moveInventoryItems` (whole-item reassign), this
 * keeps the source item in place and writes a paired ledger:
 *
 *   • 'out' row on source item, in the source space
 *   • 'in'  row on target item, in the target space
 *
 * Both rows share a transfer UUID in their `note` field so the pair
 * can be reconciled later. If no item with the source's SKU exists in
 * the target space, one is auto-created (a minimal stub with the same
 * name/category/unit/sku/min_threshold; quantity = 0 to start).
 */
export async function transferInventoryQuantity(
  tenant: TenantContext,
  sourceItemId: string,
  targetSpaceId: string,
  qty: number,
): Promise<TransferResult> {
  if (!isOrgManager(tenant) && !isPlatformAdmin(tenant))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!Number.isFinite(qty) || qty <= 0)
    throw NextResponse.json({ error: 'Quantity must be greater than zero' }, { status: 422 });

  const target = await loadTargetSpace(tenant, targetSpaceId);

  // Load source item.
  const { data: srcRow } = await supabaseAdmin
    .from('inventory_items')
    .select('id, organization_id, space_id, name, sku, category, unit, minimum_threshold, quantity_on_hand')
    .eq('id', sourceItemId)
    .maybeSingle();
  if (!srcRow || srcRow.organization_id !== tenant.organizationId)
    throw NextResponse.json({ error: 'Item not found' }, { status: 404 });
  if (srcRow.space_id === target.id)
    throw NextResponse.json({ error: 'Source and target spaces must differ' }, { status: 422 });

  await assertCanCrossSpaces(tenant, srcRow.space_id as string, target.id);

  // Current quantity on the source item (ledger-derived).
  const srcQty = await ledgerQty(sourceItemId, (srcRow.quantity_on_hand as number) ?? 0);
  if (qty > srcQty)
    throw NextResponse.json(
      { error: `Only ${srcQty} ${srcRow.unit ?? 'unit(s)'} available — cannot transfer ${qty}.` },
      { status: 422 },
    );

  // Find or auto-create the target item by SKU.
  const targetItemId = await findOrCreateTargetItem(tenant, srcRow as ItemForTransfer, target.id);
  const tgtQty = await ledgerQty(targetItemId, 0);

  const transferId = randomUUID();
  const note = `transfer:${transferId}`;

  // 1. 'out' on source.
  const { error: outErr } = await supabaseAdmin
    .from('inventory_transactions')
    .insert({
      organization_id: tenant.organizationId,
      space_id: srcRow.space_id,
      item_id: sourceItemId,
      item_name: srcRow.name,
      type: 'out',
      quantity: qty,
      quantity_before: srcQty,
      quantity_after: srcQty - qty,
      reason: `Transfer to ${target.name}`,
      note,
      performed_by: tenant.userId,
      performed_by_email: tenant.user.email ?? null,
      performed_by_name: tenant.user.displayName ?? null,
      performed_by_role: tenant.role ?? null,
    });
  if (outErr) throw outErr;

  // 2. 'in' on target.
  const { error: inErr } = await supabaseAdmin
    .from('inventory_transactions')
    .insert({
      organization_id: tenant.organizationId,
      space_id: target.id,
      item_id: targetItemId,
      item_name: srcRow.name,
      type: 'in',
      quantity: qty,
      quantity_before: tgtQty,
      quantity_after: tgtQty + qty,
      reason: `Transfer from space`,
      note,
      performed_by: tenant.userId,
      performed_by_email: tenant.user.email ?? null,
      performed_by_name: tenant.user.displayName ?? null,
      performed_by_role: tenant.role ?? null,
    });
  if (inErr) throw inErr;

  // 3. Update the cached quantity_on_hand on both items so list pages
  // reflect the new stock immediately.
  const minThreshold = (srcRow.minimum_threshold as number) ?? 0;
  await Promise.all([
    supabaseAdmin
      .from('inventory_items')
      .update({
        quantity_on_hand: srcQty - qty,
        stock_status: stockStatusFor(srcQty - qty, minThreshold),
        updated_by: tenant.userId,
      })
      .eq('id', sourceItemId),
    supabaseAdmin
      .from('inventory_items')
      .update({
        quantity_on_hand: tgtQty + qty,
        stock_status: stockStatusFor(tgtQty + qty, minThreshold),
        updated_by: tenant.userId,
      })
      .eq('id', targetItemId),
  ]);

  // 4. Audit log.
  auditLog.queue({
    tenant,
    module: 'spaces',
    action: 'INVENTORY_TRANSACTION_CREATED',
    recordId: transferId,
    newValue: {
      type: 'transfer',
      sourceItemId,
      targetItemId,
      targetSpaceId: target.id,
      targetSpaceName: target.name,
      qty,
      sku: srcRow.sku,
      name: srcRow.name,
    },
  });

  return { moved: 1, qty, sourceItemId, targetItemId, transferId };
}

/* ── helpers (local to this module) ────────────────────────────── */

async function ledgerQty(itemId: string, fallback: number): Promise<number> {
  const { data } = await supabaseAdmin
    .from('inventory_transactions')
    .select('quantity_after')
    .eq('item_id', itemId)
    .order('performed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return fallback;
  return (data.quantity_after as number) ?? fallback;
}

function stockStatusFor(qty: number, threshold: number): 'ok' | 'low' | 'out' {
  if (qty === 0) return 'out';
  if (qty < threshold) return 'low';
  return 'ok';
}

type ItemForTransfer = {
  organization_id: string;
  name: string;
  sku: string | null;
  category: string | null;
  unit: string | null;
  minimum_threshold: number | null;
};

/**
 * Locate the target item in the target space by SKU. If no SKU is set
 * on the source, or no item with that SKU exists in the target space,
 * create a stub item (quantity 0) so the 'in' ledger row has somewhere
 * to land. Returns the target item id.
 */
async function findOrCreateTargetItem(
  tenant: TenantContext,
  src: ItemForTransfer,
  targetSpaceId: string,
): Promise<string> {
  if (src.sku && src.sku.trim() !== '') {
    const { data: existing } = await supabaseAdmin
      .from('inventory_items')
      .select('id')
      .eq('organization_id', tenant.organizationId)
      .eq('space_id', targetSpaceId)
      .eq('sku', src.sku)
      .maybeSingle();
    if (existing) return existing.id as string;
  }

  // Create a stub. Per-space SKU uniqueness is enforced by Script 3,
  // so this insert is safe.
  const { data: created, error } = await supabaseAdmin
    .from('inventory_items')
    .insert({
      organization_id: tenant.organizationId,
      space_id: targetSpaceId,
      name: src.name,
      category: src.category,
      sku: src.sku,
      unit: src.unit,
      minimum_threshold: src.minimum_threshold ?? 0,
      quantity_on_hand: 0,
      stock_status: 'out',
      created_by: tenant.userId,
      updated_by: tenant.userId,
    })
    .select('id')
    .single();
  if (error) throw error;
  return created.id as string;
}
