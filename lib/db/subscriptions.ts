import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { voidPendingInvoices } from '@/lib/db/invoices';
import {
  Subscription,
  EMPTY_ADD_ONS,
  type HarakaModule,
  type SubscriptionAddOns,
  type SubscriptionLimitOverrides,
  type FoundingCohort,
} from '@/types';

type Row = Record<string, unknown>;

function toFoundingCohort(v: unknown): FoundingCohort | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (o.isFoundingCohort === undefined) return null;
  return {
    isFoundingCohort: !!o.isFoundingCohort,
    discountPercent: Number(o.discountPercent ?? 0),
    discountExpiresAt: o.discountExpiresAt ? new Date(o.discountExpiresAt as string) : null,
  };
}

function serializeFoundingCohort(fc: FoundingCohort | null | undefined): Row {
  if (!fc) return {};
  return {
    isFoundingCohort: fc.isFoundingCohort,
    discountPercent: fc.discountPercent,
    discountExpiresAt: fc.discountExpiresAt ? new Date(fc.discountExpiresAt).toISOString() : null,
  };
}

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
    activeHarakaModules: (r.active_haraka_modules ?? []) as HarakaModule[],
    activeAddOns: { ...EMPTY_ADD_ONS, ...((r.active_add_ons ?? {}) as Partial<SubscriptionAddOns>) },
    limitOverrides: (r.limit_overrides ?? {}) as SubscriptionLimitOverrides,
    foundingCohort: toFoundingCohort(r.founding_cohort),
    billingAnchorDay: (r.billing_anchor_day as number) ?? null,
    graceStartedAt: r.grace_started_at ? new Date(r.grace_started_at as string) : null,
    cancelledAt: r.cancelled_at ? new Date(r.cancelled_at as string) : null,
    cancelReason: (r.cancel_reason as string) ?? null,
    pendingPackageId: (r.pending_package_id as string) ?? null,
    pendingChangeEffectiveAt: r.pending_change_effective_at
      ? new Date(r.pending_change_effective_at as string)
      : null,
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

// The pricing-model fields are optional on create — callers that predate the
// new model (e.g. org self-serve creation) omit them and get sensible defaults.
type CreateSubscriptionInput = Omit<
  Subscription,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'activeHarakaModules'
  | 'activeAddOns'
  | 'limitOverrides'
  | 'foundingCohort'
  | 'billingAnchorDay'
  | 'graceStartedAt'
  | 'cancelledAt'
  | 'cancelReason'
  | 'pendingPackageId'
  | 'pendingChangeEffectiveAt'
> &
  Partial<
    Pick<
      Subscription,
      | 'activeHarakaModules'
      | 'activeAddOns'
      | 'limitOverrides'
      | 'foundingCohort'
      | 'billingAnchorDay'
      | 'graceStartedAt'
      | 'cancelledAt'
      | 'cancelReason'
      | 'pendingPackageId'
      | 'pendingChangeEffectiveAt'
    >
  >;

export async function createSubscription(
  data: CreateSubscriptionInput,
): Promise<string> {
  const start = new Date(data.startDate);
  const anchor =
    data.billingAnchorDay ?? Math.min(Math.max(start.getUTCDate(), 1), 28);
  const { data: row, error } = await supabaseAdmin
    .from('subscriptions')
    .insert({
      organization_id: data.organizationId,
      package_id: data.packageId ?? null,
      features: data.features ?? {},
      notes: data.notes ?? null,
      package_details: data.packageDetails ?? {},
      start_date: start.toISOString(),
      end_date: new Date(data.endDate).toISOString(),
      status: data.status,
      active_haraka_modules: data.activeHarakaModules ?? [],
      active_add_ons: data.activeAddOns ?? EMPTY_ADD_ONS,
      limit_overrides: data.limitOverrides ?? {},
      founding_cohort: serializeFoundingCohort(data.foundingCohort),
      billing_anchor_day: anchor,
      grace_started_at: data.graceStartedAt
        ? new Date(data.graceStartedAt).toISOString()
        : null,
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
  if (data.activeHarakaModules !== undefined)
    patch.active_haraka_modules = data.activeHarakaModules;
  if (data.activeAddOns !== undefined) patch.active_add_ons = data.activeAddOns;
  if (data.limitOverrides !== undefined) patch.limit_overrides = data.limitOverrides;
  if (data.foundingCohort !== undefined)
    patch.founding_cohort = serializeFoundingCohort(data.foundingCohort);
  if (data.billingAnchorDay !== undefined)
    patch.billing_anchor_day = data.billingAnchorDay;
  if (data.graceStartedAt !== undefined)
    patch.grace_started_at = data.graceStartedAt
      ? new Date(data.graceStartedAt).toISOString()
      : null;
  if (data.cancelledAt !== undefined)
    patch.cancelled_at = data.cancelledAt ? new Date(data.cancelledAt).toISOString() : null;
  if (data.cancelReason !== undefined) patch.cancel_reason = data.cancelReason;
  if (data.pendingPackageId !== undefined) patch.pending_package_id = data.pendingPackageId;
  if (data.pendingChangeEffectiveAt !== undefined)
    patch.pending_change_effective_at = data.pendingChangeEffectiveAt
      ? new Date(data.pendingChangeEffectiveAt).toISOString()
      : null;
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

/** Deliberate cancellation — distinct from the passive ACTIVE→EXPIRED cron flip. */
export async function cancelSubscription(
  id: string,
  opts: { reason: string; cancelledBy: string },
): Promise<void> {
  await updateSubscription(id, {
    status: 'CANCELLED',
    cancelledAt: new Date(),
    cancelReason: opts.reason,
    updatedBy: opts.cancelledBy,
  });
  await voidPendingInvoices(id);
}

/** Extends endDate and reactivates a lapsed subscription (EXPIRED/GRACE/READ_ONLY → ACTIVE). */
export async function renewSubscription(
  id: string,
  opts: { newEndDate: Date; currentStatus: Subscription['status']; renewedBy: string },
): Promise<void> {
  const needsReactivation = opts.currentStatus !== 'ACTIVE' && opts.currentStatus !== 'CANCELLED';
  await updateSubscription(id, {
    endDate: opts.newEndDate,
    ...(needsReactivation ? { status: 'ACTIVE' as const } : {}),
    updatedBy: opts.renewedBy,
  });
}

/** Queues a downgrade to apply automatically at the given renewal date (cron-applied). */
export async function schedulePlanChange(
  id: string,
  opts: { pendingPackageId: string; effectiveAt: Date; scheduledBy: string },
): Promise<void> {
  await updateSubscription(id, {
    pendingPackageId: opts.pendingPackageId,
    pendingChangeEffectiveAt: opts.effectiveAt,
    updatedBy: opts.scheduledBy,
  });
}

/** Applies a plan change immediately (upgrades, and the cron applying a due scheduled downgrade). */
export async function applyPlanChangeNow(
  id: string,
  opts: { packageId: string; appliedBy: string },
): Promise<void> {
  await updateSubscription(id, {
    packageId: opts.packageId,
    pendingPackageId: null,
    pendingChangeEffectiveAt: null,
    updatedBy: opts.appliedBy,
  });
}
