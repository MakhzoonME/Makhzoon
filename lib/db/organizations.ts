import { supabaseAdmin } from '@/lib/supabase/admin';
import { Organization } from '@/types';

// Phase 3 conversion (canonical pattern): Firestore collection →
// public.organizations. Public function signatures are preserved exactly so
// callers (API routes, services) need no changes. Server reads use the
// service-role client (RLS-bypass) — the direct equivalent of the previous
// firebase-admin adminDb usage.

type Row = Record<string, unknown>;

function toOrg(r: Row): Organization {
  return {
    id: r.id as string,
    name: r.name as string,
    subdomain: r.subdomain as string,
    contactEmail: r.contact_email as string,
    description: (r.description as string) ?? null,
    category: (r.category as Organization['category']) ?? null,
    packageDetails: (r.package_details ?? {}) as Organization['packageDetails'],
    assignedMemberId: (r.assigned_member_id as string) ?? null,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy: r.created_by as string,
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy: r.updated_by as string,
  };
}

export async function getOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabaseAdmin
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toOrg);
}

export async function getOrganizationById(
  id: string,
): Promise<Organization | null> {
  const { data } = await supabaseAdmin
    .from('organizations')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data ? toOrg(data) : null;
}

export async function createOrganization(
  data: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const { data: row, error } = await supabaseAdmin
    .from('organizations')
    .insert({
      name: data.name,
      subdomain: data.subdomain,
      contact_email: data.contactEmail,
      description: data.description ?? null,
      category: data.category ?? null,
      package_details: data.packageDetails ?? {},
      assigned_member_id: data.assignedMemberId ?? null,
      created_by: data.createdBy,
      updated_by: data.updatedBy,
    })
    .select('id')
    .single();
  if (error) throw error;
  return row.id as string;
}

export async function updateOrganization(
  id: string,
  data: Partial<Organization>,
): Promise<void> {
  const patch: Row = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.subdomain !== undefined) patch.subdomain = data.subdomain;
  if (data.contactEmail !== undefined) patch.contact_email = data.contactEmail;
  if (data.description !== undefined) patch.description = data.description;
  if (data.category !== undefined) patch.category = data.category;
  if (data.packageDetails !== undefined)
    patch.package_details = data.packageDetails;
  if (data.assignedMemberId !== undefined)
    patch.assigned_member_id = data.assignedMemberId;
  if (data.updatedBy !== undefined) patch.updated_by = data.updatedBy;
  const { error } = await supabaseAdmin
    .from('organizations')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

export async function subdomainExists(subdomain: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('subdomain', subdomain)
    .limit(1)
    .maybeSingle();
  return !!data;
}

export async function getOrganizationBySubdomain(
  subdomain: string,
): Promise<Organization | null> {
  const { data } = await supabaseAdmin
    .from('organizations')
    .select('*')
    .eq('subdomain', subdomain)
    .limit(1)
    .maybeSingle();
  return data ? toOrg(data) : null;
}

export async function getOrganizationsWithSearch(filters?: {
  search?: string;
  category?: string;
}): Promise<Organization[]> {
  let q = supabaseAdmin
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false });
  if (filters?.category) q = q.eq('category', filters.category);
  const term = filters?.search?.trim();
  if (term) {
    const like = `%${term}%`;
    q = q.or(
      `name.ilike.${like},subdomain.ilike.${like},contact_email.ilike.${like}`,
    );
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(toOrg);
}
