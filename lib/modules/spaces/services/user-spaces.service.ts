import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { TenantContext } from '@/lib/platform/tenancy/types';

const PLATFORM_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);
const MGR_ROLES = new Set(['org_owner', 'admin']);

function canManage(t: TenantContext) {
  return PLATFORM_ROLES.has(t.role) || MGR_ROLES.has(t.role);
}

/**
 * Get a user's space-access configuration:
 *   - allSpaces: the users.all_spaces flag
 *   - spaceIds:  ids of spaces they have explicit membership in
 *
 * Owners default to allSpaces=true (the Script 3 trigger sets it on
 * insert), but they CAN have explicit memberships if an admin opts
 * them out. Admin/staff default to false + assigned memberships.
 */
export async function getUserSpaceAccess(
  tenant: TenantContext,
  userId: string,
): Promise<{ allSpaces: boolean; spaceIds: string[] }> {
  if (!canManage(tenant))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Verify user belongs to caller's org.
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('organization_id, all_spaces')
    .eq('id', userId)
    .maybeSingle();
  if (!user || user.organization_id !== tenant.organizationId)
    throw NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { data: memberships } = await supabaseAdmin
    .from('space_members')
    .select('space_id')
    .eq('user_id', userId)
    .eq('organization_id', tenant.organizationId);

  return {
    allSpaces: !!user.all_spaces,
    spaceIds: (memberships ?? []).map((m) => m.space_id as string),
  };
}

/**
 * Set a user's space access. Atomic-ish:
 *   1. Update users.all_spaces.
 *   2. Reconcile space_members → exactly the provided spaceIds.
 *      (No-op rows are kept; missing rows are deleted; new rows inserted.)
 *
 * When `allSpaces=true`, spaceIds is ignored (the helper grants access
 * to every org space anyway). We still clear stale rows for cleanliness.
 */
export async function setUserSpaceAccess(
  tenant: TenantContext,
  userId: string,
  patch: { allSpaces: boolean; spaceIds: string[] },
): Promise<void> {
  if (!canManage(tenant))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Verify user is in this org.
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('organization_id, role')
    .eq('id', userId)
    .maybeSingle();
  if (!user || user.organization_id !== tenant.organizationId)
    throw NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Validate every requested space id belongs to the same org.
  let validSpaceIds: string[] = [];
  if (patch.spaceIds.length > 0) {
    const { data: validRows } = await supabaseAdmin
      .from('spaces')
      .select('id')
      .eq('organization_id', tenant.organizationId)
      .in('id', patch.spaceIds);
    validSpaceIds = (validRows ?? []).map((r) => r.id as string);
  }

  // 1. Update the flag.
  const { error: uErr } = await supabaseAdmin
    .from('users')
    .update({ all_spaces: patch.allSpaces, updated_by: tenant.userId })
    .eq('id', userId);
  if (uErr) throw uErr;

  // 2. Reconcile memberships.
  const { data: existing } = await supabaseAdmin
    .from('space_members')
    .select('space_id')
    .eq('user_id', userId)
    .eq('organization_id', tenant.organizationId);

  const have = new Set((existing ?? []).map((r) => r.space_id as string));
  const want = new Set(validSpaceIds);

  const toRemove = [...have].filter((id) => !want.has(id));
  const toAdd = [...want].filter((id) => !have.has(id));

  if (toRemove.length > 0) {
    const { error: dErr } = await supabaseAdmin
      .from('space_members')
      .delete()
      .eq('user_id', userId)
      .eq('organization_id', tenant.organizationId)
      .in('space_id', toRemove);
    if (dErr) throw dErr;
  }

  if (toAdd.length > 0) {
    const rows = toAdd.map((space_id) => ({
      organization_id: tenant.organizationId,
      space_id,
      user_id: userId,
      created_by: tenant.userId,
    }));
    const { error: iErr } = await supabaseAdmin
      .from('space_members')
      .insert(rows);
    if (iErr) throw iErr;
  }
}
