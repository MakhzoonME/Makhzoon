import 'server-only';
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

export interface DuplicateResult { duplicated: number; newIds: string[] }

/* ── Assets ──────────────────────────────────────────────────── */

/**
 * Duplicate one or more assets into a target space. The originals stay
 * in their source space; new asset rows are inserted in the target with
 * the same name/category/serial/etc. Notes, maintenance, checkouts and
 * warranties are intentionally NOT copied — the duplicate is a fresh
 * record with no history.
 */
export async function duplicateAssets(
  tenant: TenantContext,
  assetIds: string[],
  targetSpaceId: string,
): Promise<DuplicateResult> {
  if (!isOrgManager(tenant) && !isPlatformAdmin(tenant)) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (assetIds.length === 0) return { duplicated: 0, newIds: [] };

  const target = await loadTargetSpace(tenant, targetSpaceId);

  const { data: srcRows } = await supabaseAdmin
    .from('assets')
    .select('id, organization_id, space_id, name, category, status, serial_number, purchase_date, purchase_cost, assigned_to, location, notes')
    .in('id', assetIds);
  type AssetRow = {
    id: string; organization_id: string; space_id: string;
    name: string; category: string | null; status: string | null;
    serial_number: string | null; purchase_date: string | null;
    purchase_cost: number | null; assigned_to: string | null;
    location: string | null; notes: string | null;
  };
  const rows = (srcRows ?? []) as AssetRow[];
  if (rows.length !== assetIds.length || rows.some((r) => r.organization_id !== tenant.organizationId)) {
    throw NextResponse.json({ error: 'One or more assets not found' }, { status: 404 });
  }

  const sources = [...new Set(rows.map((r) => r.space_id))];
  for (const src of sources) {
    await assertCanCrossSpaces(tenant, src, target.id);
  }

  const inserts = rows.map((r) => ({
    organization_id: tenant.organizationId,
    space_id: target.id,
    name: r.name,
    category: r.category,
    status: r.status,
    serial_number: r.serial_number,
    purchase_date: r.purchase_date,
    purchase_cost: r.purchase_cost,
    assigned_to: r.assigned_to,
    location: r.location,
    notes: r.notes,
    created_by: tenant.userId,
    created_by_email: tenant.user.email ?? null,
    created_by_name: tenant.user.displayName ?? null,
    created_by_role: tenant.role ?? null,
    updated_by: tenant.userId,
    updated_by_email: tenant.user.email ?? null,
    updated_by_name: tenant.user.displayName ?? null,
    updated_by_role: tenant.role ?? null,
  }));

  const { data: inserted, error } = await supabaseAdmin
    .from('assets')
    .insert(inserts)
    .select('id, name');
  if (error) {
    if ((error as { code?: string }).code === '23505')
      throw NextResponse.json(
        { error: 'A serial number already exists in the target space.' },
        { status: 409 },
      );
    throw error;
  }
  const newIds = (inserted ?? []).map((r) => r.id as string);

  for (let i = 0; i < newIds.length; i++) {
    auditLog.queue({
      tenant,
      module: 'spaces',
      action: 'ASSET_CREATED',
      recordId: newIds[i],
      newValue: {
        type: 'duplicate',
        sourceAssetId: rows[i].id,
        sourceSpaceId: rows[i].space_id,
        targetSpaceId: target.id,
        targetSpaceName: target.name,
        name: rows[i].name,
      },
    });
  }
  return { duplicated: newIds.length, newIds };
}


/* ── Inventory items ─────────────────────────────────────────── */

/**
 * Duplicate one or more inventory items into a target space. Stock
 * does NOT carry over — the duplicate starts at quantity 0 (a fresh
 * item record in the target). Transactions stay attached to the
 * original item in its source space.
 */
export async function duplicateInventoryItems(
  tenant: TenantContext,
  itemIds: string[],
  targetSpaceId: string,
): Promise<DuplicateResult> {
  if (!isOrgManager(tenant) && !isPlatformAdmin(tenant)) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (itemIds.length === 0) return { duplicated: 0, newIds: [] };

  const target = await loadTargetSpace(tenant, targetSpaceId);

  const { data: srcRows } = await supabaseAdmin
    .from('inventory_items')
    .select('id, organization_id, space_id, name, category, sku, unit, minimum_threshold, reorder_quantity, location, supplier, unit_cost, notes, barcode, pos_enabled, pos_price, tax_rate_id')
    .in('id', itemIds);
  type ItemRow = {
    id: string; organization_id: string; space_id: string;
    name: string; category: string | null; sku: string | null;
    unit: string | null; minimum_threshold: number | null;
    reorder_quantity: number | null; location: string | null;
    supplier: string | null; unit_cost: number | null;
    notes: string | null; barcode: string | null;
    pos_enabled: boolean | null; pos_price: number | null;
    tax_rate_id: string | null;
  };
  const rows = (srcRows ?? []) as ItemRow[];
  if (rows.length !== itemIds.length || rows.some((r) => r.organization_id !== tenant.organizationId)) {
    throw NextResponse.json({ error: 'One or more items not found' }, { status: 404 });
  }

  const sources = [...new Set(rows.map((r) => r.space_id))];
  for (const src of sources) {
    await assertCanCrossSpaces(tenant, src, target.id);
  }

  const inserts = rows.map((r) => ({
    organization_id: tenant.organizationId,
    space_id: target.id,
    name: r.name,
    category: r.category,
    sku: r.sku,
    unit: r.unit,
    minimum_threshold: r.minimum_threshold ?? 0,
    reorder_quantity: r.reorder_quantity,
    location: r.location,
    supplier: r.supplier,
    unit_cost: r.unit_cost,
    notes: r.notes,
    barcode: r.barcode,
    pos_enabled: r.pos_enabled ?? false,
    pos_price: r.pos_price,
    tax_rate_id: r.tax_rate_id,
    quantity_on_hand: 0,
    stock_status: 'out',
    created_by: tenant.userId,
    created_by_email: tenant.user.email ?? null,
    created_by_name: tenant.user.displayName ?? null,
    updated_by: tenant.userId,
    updated_by_email: tenant.user.email ?? null,
    updated_by_name: tenant.user.displayName ?? null,
  }));

  const { data: inserted, error } = await supabaseAdmin
    .from('inventory_items')
    .insert(inserts)
    .select('id, name, sku');
  if (error) {
    if ((error as { code?: string }).code === '23505')
      throw NextResponse.json(
        { error: 'An item with the same SKU or barcode already exists in the target space.' },
        { status: 409 },
      );
    throw error;
  }
  const newIds = (inserted ?? []).map((r) => r.id as string);

  for (let i = 0; i < newIds.length; i++) {
    auditLog.queue({
      tenant,
      module: 'spaces',
      action: 'INVENTORY_ITEM_CREATED',
      recordId: newIds[i],
      newValue: {
        type: 'duplicate',
        sourceItemId: rows[i].id,
        sourceSpaceId: rows[i].space_id,
        targetSpaceId: target.id,
        targetSpaceName: target.name,
        name: rows[i].name,
        sku: rows[i].sku,
      },
    });
  }
  return { duplicated: newIds.length, newIds };
}


/* ── Requests ────────────────────────────────────────────────── */

/**
 * Duplicate one or more requests into a target space. The referenced
 * asset / inventory item MUST already exist in the target space —
 * mirrors the constraint on moveRequests. The duplicate is set to
 * PENDING and attributed to the caller.
 */
export async function duplicateRequests(
  tenant: TenantContext,
  requestIds: string[],
  targetSpaceId: string,
): Promise<DuplicateResult> {
  if (!isOrgManager(tenant) && !isPlatformAdmin(tenant)) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (requestIds.length === 0) return { duplicated: 0, newIds: [] };

  const target = await loadTargetSpace(tenant, targetSpaceId);

  const { data: srcRows } = await supabaseAdmin
    .from('requests')
    .select('id, organization_id, space_id, type, asset_id, warranty_id, inventory_item_id, inventory_item_name, description')
    .in('id', requestIds);
  type RequestRow = {
    id: string; organization_id: string; space_id: string;
    type: string; asset_id: string | null;
    warranty_id: string | null; inventory_item_id: string | null;
    inventory_item_name: string | null; description: string | null;
  };
  const rows = (srcRows ?? []) as RequestRow[];
  if (rows.length !== requestIds.length || rows.some((r) => r.organization_id !== tenant.organizationId)) {
    throw NextResponse.json({ error: 'One or more requests not found' }, { status: 404 });
  }

  const sources = [...new Set(rows.map((r) => r.space_id))];
  for (const src of sources) {
    await assertCanCrossSpaces(tenant, src, target.id);
  }

  // Verify referenced assets/items exist in the target space.
  const assetIds = rows.map((r) => r.asset_id).filter((x): x is string => !!x);
  const itemIds = rows.map((r) => r.inventory_item_id).filter((x): x is string => !!x);

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
  const blockers = rows.filter((r) =>
    (r.asset_id && !assetsInTarget.has(r.asset_id)) ||
    (r.inventory_item_id && !itemsInTarget.has(r.inventory_item_id)),
  );
  if (blockers.length > 0) {
    throw NextResponse.json(
      {
        error: `Cannot duplicate ${blockers.length} request(s): the referenced asset or item is not in ${target.name}.`,
      },
      { status: 409 },
    );
  }

  const inserts = rows.map((r) => ({
    organization_id: tenant.organizationId,
    space_id: target.id,
    type: r.type,
    asset_id: r.asset_id,
    warranty_id: r.warranty_id,
    inventory_item_id: r.inventory_item_id,
    inventory_item_name: r.inventory_item_name,
    description: r.description,
    status: 'PENDING',
    created_by: tenant.userId,
    updated_by: tenant.userId,
  }));

  const { data: inserted, error } = await supabaseAdmin
    .from('requests')
    .insert(inserts)
    .select('id');
  if (error) throw error;
  const newIds = (inserted ?? []).map((r) => r.id as string);

  for (let i = 0; i < newIds.length; i++) {
    auditLog.queue({
      tenant,
      module: 'spaces',
      action: 'REQUEST_SUBMITTED',
      recordId: newIds[i],
      newValue: {
        kind: 'duplicate',
        sourceRequestId: rows[i].id,
        sourceSpaceId: rows[i].space_id,
        targetSpaceId: target.id,
        targetSpaceName: target.name,
        type: rows[i].type,
      },
    });
  }
  return { duplicated: newIds.length, newIds };
}


/* ── POS Customers ───────────────────────────────────────────── */

/**
 * Duplicate one or more customers into a target space. The original
 * customer record stays in its source space; a new pos_customers row
 * is inserted in the target with the same contact details. Past
 * sales attached to the source customer keep their original
 * customer_id reference.
 */
export async function duplicateCustomers(
  tenant: TenantContext,
  customerIds: string[],
  targetSpaceId: string,
): Promise<DuplicateResult> {
  if (!isOrgManager(tenant) && !isPlatformAdmin(tenant)) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (customerIds.length === 0) return { duplicated: 0, newIds: [] };

  const target = await loadTargetSpace(tenant, targetSpaceId);

  const { data: srcRows } = await supabaseAdmin
    .from('pos_customers')
    .select('id, organization_id, space_id, name, phone, email, tax_number, notes')
    .in('id', customerIds);
  type CustomerRow = {
    id: string; organization_id: string; space_id: string;
    name: string; phone: string | null; email: string | null;
    tax_number: string | null; notes: string | null;
  };
  const rows = (srcRows ?? []) as CustomerRow[];
  if (rows.length !== customerIds.length || rows.some((c) => c.organization_id !== tenant.organizationId)) {
    throw NextResponse.json({ error: 'One or more customers not found' }, { status: 404 });
  }

  const sources = [...new Set(rows.map((c) => c.space_id))];
  for (const src of sources) {
    await assertCanCrossSpaces(tenant, src, target.id);
  }

  const inserts = rows.map((r) => ({
    organization_id: tenant.organizationId,
    space_id: target.id,
    name: r.name,
    phone: r.phone,
    email: r.email,
    tax_number: r.tax_number,
    notes: r.notes,
    created_by: tenant.userId,
    updated_by: tenant.userId,
  }));

  const { data: inserted, error } = await supabaseAdmin
    .from('pos_customers')
    .insert(inserts)
    .select('id, name');
  if (error) throw error;
  const newIds = (inserted ?? []).map((r) => r.id as string);

  for (let i = 0; i < newIds.length; i++) {
    auditLog.queue({
      tenant,
      module: 'spaces',
      action: 'POS_CUSTOMER_CREATED',
      recordId: newIds[i],
      newValue: {
        kind: 'duplicate',
        sourceCustomerId: rows[i].id,
        sourceSpaceId: rows[i].space_id,
        targetSpaceId: target.id,
        targetSpaceName: target.name,
        name: rows[i].name,
      },
    });
  }
  return { duplicated: newIds.length, newIds };
}
