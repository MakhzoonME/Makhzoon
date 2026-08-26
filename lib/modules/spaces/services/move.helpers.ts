import 'server-only';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { TenantContext } from '@/lib/platform/tenancy/types';

const PLATFORM_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);
const MGR_ROLES = new Set(['org_owner', 'admin']);

export function isPlatformAdmin(t: TenantContext) {
  return PLATFORM_ROLES.has(t.role);
}
export function isOrgManager(t: TenantContext) {
  return MGR_ROLES.has(t.role);
}

export interface MoveResult { moved: number }

/**
 * Check that the caller can access BOTH source and target spaces.
 *
 * Platform admins bypass. Owners with all_spaces=true bypass.
 * Otherwise we require explicit `space_members` rows for both spaces,
 * mirroring the can_access_space() SQL helper.
 */
export async function assertCanCrossSpaces(
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
export async function loadTargetSpace(tenant: TenantContext, targetSpaceId: string) {
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
