import 'server-only';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { TenantContext } from '@/lib/platform/tenancy/types';
import { auditLog } from '@/lib/platform/audit';
import { stockStatus } from '@/lib/modules/inventory/stock-status';
import { isOrgManager, isPlatformAdmin, assertCanCrossSpaces, loadTargetSpace } from './move.helpers';

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
        stock_status: stockStatus(srcQty - qty, minThreshold),
        updated_by: tenant.userId,
      })
      .eq('id', sourceItemId),
    supabaseAdmin
      .from('inventory_items')
      .update({
        quantity_on_hand: tgtQty + qty,
        stock_status: stockStatus(tgtQty + qty, minThreshold),
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
