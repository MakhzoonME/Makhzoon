import { supabaseAdmin } from '@/lib/supabase/admin';
import { OrgUser, UserPermissions } from '@/types';

// Phase 3 conversion: Firestore `users` → public.users. With Supabase,
// public.users.email is kept in sync with auth.users, so the previous
// per-request Firebase-Auth email enrichment is no longer required (the
// scrubbed-placeholder concern came from the Firestore clone scripts).

type Row = Record<string, unknown>;

function toUser(r: Row): OrgUser {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    email: r.email as string,
    username: r.username as string,
    displayName: r.display_name as string,
    avatarUrl: (r.avatar_url ?? null) as string | null,
    role: r.role as OrgUser['role'],
    status: (r.status as OrgUser['status']) ?? 'active',
    permissions: (r.permissions ?? null) as UserPermissions | null,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy: r.created_by as string,
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy: r.updated_by as string,
  };
}

export async function getUsers(orgId: string): Promise<OrgUser[]> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map(toUser);
}

export async function getUserById(id: string): Promise<OrgUser | null> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data ? toUser(data) : null;
}

export async function createUser(
  id: string,
  data: Omit<OrgUser, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<void> {
  const { error } = await supabaseAdmin.from('users').insert({
    id,
    organization_id: data.organizationId,
    email: data.email,
    username: data.username,
    display_name: data.displayName,
    role: data.role,
    status: data.status ?? 'active',
    permissions: data.permissions ?? null,
    created_by: data.createdBy,
    updated_by: data.updatedBy,
  });
  if (error) throw error;
}

export async function updateUser(
  id: string,
  data: Partial<OrgUser>,
): Promise<void> {
  const patch: Row = {};
  if (data.organizationId !== undefined)
    patch.organization_id = data.organizationId;
  if (data.email !== undefined) patch.email = data.email;
  if (data.username !== undefined) patch.username = data.username;
  if (data.displayName !== undefined) patch.display_name = data.displayName;
  if (data.avatarUrl !== undefined) patch.avatar_url = data.avatarUrl;
  if (data.role !== undefined) patch.role = data.role;
  if (data.status !== undefined) patch.status = data.status;
  if (data.permissions !== undefined) patch.permissions = data.permissions;
  if (data.updatedBy !== undefined) patch.updated_by = data.updatedBy;
  const { error } = await supabaseAdmin
    .from('users')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}
