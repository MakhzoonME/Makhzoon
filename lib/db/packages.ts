import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Package, PackageLimits, FeatureKey } from '@/types';

type Row = Record<string, unknown>;

function toPackage(r: Row): Package {
  const limits = (r.limits ?? {}) as Partial<PackageLimits>;
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? '',
    isActive: (r.is_active as boolean) ?? true,
    limits: {
      maxAssets: limits.maxAssets ?? -1,
      maxUsers: limits.maxUsers ?? -1,
      maxWarranties: limits.maxWarranties ?? -1,
      maxRequests: limits.maxRequests ?? -1,
    },
    features: (r.features ?? {}) as Record<FeatureKey, boolean>,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy: (r.created_by as string) ?? '',
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy: (r.updated_by as string) ?? '',
  };
}

export async function getPackages(opts?: {
  includeInactive?: boolean;
}): Promise<Package[]> {
  let q = supabaseAdmin.from('packages').select('*').order('name');
  if (!opts?.includeInactive) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(toPackage);
}

export async function getPackageById(
  packageId: string,
): Promise<Package | null> {
  const { data } = await supabaseAdmin
    .from('packages')
    .select('*')
    .eq('id', packageId)
    .maybeSingle();
  return data ? toPackage(data) : null;
}

export async function getPackagesByIds(ids: string[]): Promise<Package[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabaseAdmin
    .from('packages')
    .select('*')
    .in('id', Array.from(new Set(ids)));
  if (error) throw error;
  return (data ?? []).map(toPackage);
}

export async function createPackage(
  userId: string,
  payload: {
    name: string;
    description: string;
    isActive: boolean;
    limits: PackageLimits;
    features: Record<FeatureKey, boolean>;
  },
): Promise<Package> {
  const { data, error } = await supabaseAdmin
    .from('packages')
    .insert({
      name: payload.name,
      description: payload.description,
      is_active: payload.isActive,
      limits: payload.limits,
      features: payload.features,
      created_by: userId,
      updated_by: userId,
    })
    .select('*')
    .single();
  if (error) throw error;
  return toPackage(data);
}

export async function updatePackage(
  packageId: string,
  userId: string,
  updates: Partial<
    Pick<Package, 'name' | 'description' | 'isActive' | 'limits' | 'features'>
  >,
): Promise<void> {
  const patch: Row = { updated_by: userId };
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.isActive !== undefined) patch.is_active = updates.isActive;
  if (updates.limits !== undefined) patch.limits = updates.limits;
  if (updates.features !== undefined) patch.features = updates.features;
  const { error } = await supabaseAdmin
    .from('packages')
    .update(patch)
    .eq('id', packageId);
  if (error) throw error;
}

export async function deletePackage(
  packageId: string,
  userId: string,
): Promise<void> {
  // Soft delete: keep historical references intact.
  const { error } = await supabaseAdmin
    .from('packages')
    .update({ is_active: false, updated_by: userId })
    .eq('id', packageId);
  if (error) throw error;
}
