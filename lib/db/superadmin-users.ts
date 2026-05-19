import { supabaseAdmin } from '@/lib/supabase/admin';
import type { SuperAdminPermissions } from '@/types';

export type MakhzoonRole = 'super_admin' | 'makhzoon_admin' | 'makhzoon_support';

export interface SuperAdminUser {
  id: string;
  email: string;
  displayName: string;
  role: MakhzoonRole;
  status: 'active' | 'deactivated';
  permissions?: SuperAdminPermissions;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

type Row = Record<string, unknown>;

function toSuperAdminUser(r: Row): SuperAdminUser {
  return {
    id: r.id as string,
    email: r.email as string,
    displayName: r.display_name as string,
    role: r.role as MakhzoonRole,
    status: (r.status as 'active' | 'deactivated') ?? 'active',
    permissions: (r.permissions as SuperAdminPermissions) ?? undefined,
    createdBy: r.created_by as string,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
  };
}

export async function getSuperAdminUsers(): Promise<SuperAdminUser[]> {
  const { data, error } = await supabaseAdmin
    .from('superadmin_users')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map(toSuperAdminUser);
}

export async function createSuperAdminUser(
  uid: string,
  data: {
    email: string;
    displayName: string;
    role: MakhzoonRole;
    createdBy: string;
    permissions?: SuperAdminPermissions;
  },
): Promise<void> {
  const { error } = await supabaseAdmin.from('superadmin_users').upsert(
    {
      id: uid,
      email: data.email,
      display_name: data.displayName,
      role: data.role,
      status: 'active',
      permissions: data.permissions ?? null,
      created_by: data.createdBy,
      updated_by: data.createdBy,
    },
    { onConflict: 'id' },
  );
  if (error) throw error;
}

export async function updateSuperAdminUser(
  uid: string,
  data: {
    role?: MakhzoonRole;
    status?: 'active' | 'deactivated';
    permissions?: SuperAdminPermissions | null;
    updatedBy: string;
  },
): Promise<void> {
  const patch: Row = { updated_by: data.updatedBy };
  if (data.role !== undefined) patch.role = data.role;
  if (data.status !== undefined) patch.status = data.status;
  // null clears the permissions (Firestore FieldValue.delete() equivalent).
  if (data.permissions !== undefined) patch.permissions = data.permissions ?? null;
  const { error } = await supabaseAdmin
    .from('superadmin_users')
    .update(patch)
    .eq('id', uid);
  if (error) throw error;
}

export async function deleteSuperAdminUser(uid: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('superadmin_users')
    .delete()
    .eq('id', uid);
  if (error) throw error;
}

export async function getSuperAdminUserById(
  uid: string,
): Promise<SuperAdminUser | null> {
  const { data } = await supabaseAdmin
    .from('superadmin_users')
    .select('*')
    .eq('id', uid)
    .maybeSingle();
  return data ? toSuperAdminUser(data) : null;
}
