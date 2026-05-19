import { supabaseAdmin } from '@/lib/supabase/admin';
import { Subscription } from '@/types';

type Row = Record<string, unknown>;

function toSubscription(r: Row): Subscription {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    packageId: (r.package_id as string) ?? null,
    features: (r.features ?? {}) as Subscription['features'],
    notes: (r.notes as string) ?? null,
    packageDetails: (r.package_details ?? {}) as Subscription['packageDetails'],
    startDate: new Date(r.start_date as string),
    endDate: new Date(r.end_date as string),
    status: r.status as Subscription['status'],
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy: r.created_by as string,
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy: r.updated_by as string,
  };
}

export async function getSubscriptionByOrg(
  orgId: string,
): Promise<Subscription | null> {
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('organization_id', orgId)
    .limit(1)
    .maybeSingle();
  return data ? toSubscription(data) : null;
}

export async function createSubscription(
  data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const { data: row, error } = await supabaseAdmin
    .from('subscriptions')
    .insert({
      organization_id: data.organizationId,
      package_id: data.packageId ?? null,
      features: data.features ?? {},
      notes: data.notes ?? null,
      package_details: data.packageDetails ?? {},
      start_date: new Date(data.startDate).toISOString(),
      end_date: new Date(data.endDate).toISOString(),
      status: data.status,
      created_by: data.createdBy,
      updated_by: data.updatedBy,
    })
    .select('id')
    .single();
  if (error) throw error;
  return row.id as string;
}

export async function updateSubscription(
  id: string,
  data: Partial<Subscription>,
): Promise<void> {
  const patch: Row = {};
  if (data.packageId !== undefined) patch.package_id = data.packageId;
  if (data.features !== undefined) patch.features = data.features;
  if (data.notes !== undefined) patch.notes = data.notes;
  if (data.packageDetails !== undefined)
    patch.package_details = data.packageDetails;
  if (data.startDate !== undefined)
    patch.start_date = new Date(data.startDate).toISOString();
  if (data.endDate !== undefined)
    patch.end_date = new Date(data.endDate).toISOString();
  if (data.status !== undefined) patch.status = data.status;
  if (data.updatedBy !== undefined) patch.updated_by = data.updatedBy;
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

export async function getSubscriptionsByOrgs(
  orgIds: string[],
): Promise<Subscription[]> {
  if (orgIds.length === 0) return [];
  const unique = Array.from(new Set(orgIds));
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .in('organization_id', unique);
  if (error) throw error;
  return (data ?? []).map(toSubscription);
}
