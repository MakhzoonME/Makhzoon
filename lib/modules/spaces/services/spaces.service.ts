import 'server-only';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { TenantContext } from '@/lib/platform/tenancy/types';
import type { Space, SpaceMember } from '@/types/space.types';
import { auditLog } from '@/lib/platform/audit';

const PLATFORM_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);
const MGR_ROLES = new Set(['org_owner', 'admin']);

function isPlatformAdmin(t: TenantContext) {
  return PLATFORM_ROLES.has(t.role);
}
function isOrgManager(t: TenantContext) {
  return MGR_ROLES.has(t.role);
}

type SpaceRow = {
  id: string; organization_id: string; name: string; slug: string;
  status: string; is_default: boolean;
  created_at: string; created_by: string | null;
  updated_at: string; updated_by: string | null;
};

function toSpace(r: SpaceRow): Space {
  return {
    id: r.id,
    organizationId: r.organization_id,
    name: r.name,
    slug: r.slug,
    status: r.status as Space['status'],
    isDefault: r.is_default,
    createdAt: new Date(r.created_at),
    createdBy: r.created_by ?? '',
    updatedAt: new Date(r.updated_at),
    updatedBy: r.updated_by ?? '',
  };
}

/** All spaces this caller can navigate to in their org. Active spaces only. */
export async function listAccessible(tenant: TenantContext): Promise<Space[]> {
  // Platform admins via service role bypass; here we return all org spaces.
  if (isPlatformAdmin(tenant)) {
    const { data, error } = await supabaseAdmin
      .from('spaces')
      .select('*')
      .eq('organization_id', tenant.organizationId)
      .eq('status', 'active')
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => toSpace(r as SpaceRow));
  }

  // Org users: tenant.accessibleSpaceIds was resolved by resolveTenant.
  const ids = tenant.accessibleSpaceIds ?? [];
  if (ids.length === 0) return [];
  const { data, error } = await supabaseAdmin
    .from('spaces')
    .select('*')
    .eq('organization_id', tenant.organizationId)
    .eq('status', 'active')
    .in('id', ids)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => toSpace(r as SpaceRow));
}

/** Org-wide list including archived, with `memberCount` per row. Admin/owner only. */
export async function listAllForOrg(tenant: TenantContext): Promise<Space[]> {
  if (!isOrgManager(tenant) && !isPlatformAdmin(tenant))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data, error } = await supabaseAdmin
    .from('spaces')
    .select('*')
    .eq('organization_id', tenant.organizationId)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });
  if (error) throw error;
  const spaces = (data ?? []).map((r) => toSpace(r as SpaceRow));

  // Member counts. One round-trip; group on the client.
  const { data: memberRows } = await supabaseAdmin
    .from('space_members')
    .select('space_id')
    .eq('organization_id', tenant.organizationId);
  const counts = new Map<string, number>();
  for (const m of (memberRows ?? []) as Array<{ space_id: string }>) {
    counts.set(m.space_id, (counts.get(m.space_id) ?? 0) + 1);
  }
  return spaces.map((s) => ({ ...s, memberCount: counts.get(s.id) ?? 0 }));
}

export async function create(
  tenant: TenantContext,
  input: { name: string; slug?: string },
): Promise<Space> {
  if (!isOrgManager(tenant) && !isPlatformAdmin(tenant))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const name = input.name.trim();
  if (!name) throw NextResponse.json({ error: 'Name is required' }, { status: 422 });

  const slug = (input.slug ?? name)
    .trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Reserved slugs (collide with org-wide static segments).
  const RESERVED = new Set(['settings', 'users', 'subscription', 'profile', 'support', 'api', 'auth', 'dashboard']);
  if (!slug || RESERVED.has(slug))
    throw NextResponse.json({ error: 'That slug is reserved' }, { status: 422 });

  const { data, error } = await supabaseAdmin
    .from('spaces')
    .insert({
      organization_id: tenant.organizationId,
      name,
      slug,
      is_default: false,
      created_by: tenant.userId,
      updated_by: tenant.userId,
    })
    .select('*')
    .single();
  if (error) {
    // Friendly message for unique-constraint collisions.
    if ((error as { code?: string }).code === '23505')
      throw NextResponse.json({ error: 'A space with that name or slug already exists' }, { status: 409 });
    throw error;
  }
  const space = toSpace(data as SpaceRow);
  auditLog.queue({
    tenant,
    module: 'spaces',
    action: 'SPACE_CREATED',
    recordId: space.id,
    newValue: { name: space.name, slug: space.slug },
  });
  return space;
}

export async function update(
  tenant: TenantContext,
  spaceId: string,
  input: { name?: string; status?: Space['status'] },
): Promise<Space> {
  if (!isOrgManager(tenant) && !isPlatformAdmin(tenant))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const patch: Record<string, unknown> = { updated_by: tenant.userId };
  if (input.name !== undefined) {
    const n = input.name.trim();
    if (!n) throw NextResponse.json({ error: 'Name is required' }, { status: 422 });
    patch.name = n;
  }
  if (input.status !== undefined) {
    if (!['active', 'archived'].includes(input.status))
      throw NextResponse.json({ error: 'Invalid status' }, { status: 422 });
    patch.status = input.status;
  }

  // Guard: the Default space cannot be archived.
  if (input.status === 'archived') {
    const { data: current } = await supabaseAdmin
      .from('spaces').select('is_default, organization_id').eq('id', spaceId).maybeSingle();
    if (!current || current.organization_id !== tenant.organizationId)
      throw NextResponse.json({ error: 'Space not found' }, { status: 404 });
    if (current.is_default)
      throw NextResponse.json({ error: 'The default space cannot be archived' }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin
    .from('spaces')
    .update(patch)
    .eq('id', spaceId)
    .eq('organization_id', tenant.organizationId)
    .select('*')
    .single();
  if (error) {
    if ((error as { code?: string }).code === '23505')
      throw NextResponse.json({ error: 'A space with that name already exists' }, { status: 409 });
    throw error;
  }
  if (!data) throw NextResponse.json({ error: 'Space not found' }, { status: 404 });

  const space = toSpace(data as SpaceRow);
  auditLog.queue({
    tenant,
    module: 'spaces',
    action: input.status === 'archived' ? 'SPACE_ARCHIVED' : 'SPACE_UPDATED',
    recordId: space.id,
    newValue: patch,
  });
  return space;
}

/** Members of a space (admin only). Includes a display name lookup. */
export async function listMembers(
  tenant: TenantContext,
  spaceId: string,
): Promise<Array<SpaceMember & { displayName?: string; email?: string }>> {
  if (!isOrgManager(tenant) && !isPlatformAdmin(tenant))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // spaceId may be a slug (e.g. "default") or a UUID — resolve to UUID if needed
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let resolvedSpaceId = spaceId;
  if (!UUID_RE.test(spaceId)) {
    const { data: spaceRow } = await supabaseAdmin
      .from('spaces')
      .select('id')
      .eq('organization_id', tenant.organizationId)
      .eq('slug', spaceId)
      .maybeSingle();
    if (spaceRow) resolvedSpaceId = spaceRow.id;
  }

  const { data, error } = await supabaseAdmin
    .from('space_members')
    .select('id, organization_id, space_id, user_id, created_at, created_by, users!inner(display_name, email)')
    .eq('space_id', resolvedSpaceId)
    .eq('organization_id', tenant.organizationId);
  if (error) throw error;

  type Row = {
    id: string; organization_id: string; space_id: string; user_id: string;
    created_at: string; created_by: string | null;
    users: { display_name: string | null; email: string | null } | null;
  };
  return (data as unknown as Row[] ?? []).map((r) => ({
    id: r.id,
    organizationId: r.organization_id,
    spaceId: r.space_id,
    userId: r.user_id,
    createdAt: new Date(r.created_at),
    createdBy: r.created_by ?? '',
    displayName: r.users?.display_name ?? undefined,
    email: r.users?.email ?? undefined,
  }));
}

export async function addMember(
  tenant: TenantContext,
  spaceId: string,
  userId: string,
): Promise<void> {
  if (!isOrgManager(tenant) && !isPlatformAdmin(tenant))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Confirm both space and user belong to this org.
  const [{ data: space }, { data: user }] = await Promise.all([
    supabaseAdmin.from('spaces').select('organization_id').eq('id', spaceId).maybeSingle(),
    supabaseAdmin.from('users').select('organization_id').eq('id', userId).maybeSingle(),
  ]);
  if (!space || space.organization_id !== tenant.organizationId)
    throw NextResponse.json({ error: 'Space not found' }, { status: 404 });
  if (!user || user.organization_id !== tenant.organizationId)
    throw NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { error } = await supabaseAdmin
    .from('space_members')
    .insert({
      organization_id: tenant.organizationId,
      space_id: spaceId,
      user_id: userId,
      created_by: tenant.userId,
    });
  if (error && (error as { code?: string }).code !== '23505') throw error;
}

export async function removeMember(
  tenant: TenantContext,
  spaceId: string,
  userId: string,
): Promise<void> {
  if (!isOrgManager(tenant) && !isPlatformAdmin(tenant))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await supabaseAdmin
    .from('space_members')
    .delete()
    .eq('space_id', spaceId)
    .eq('user_id', userId)
    .eq('organization_id', tenant.organizationId);
  if (error) throw error;
}
