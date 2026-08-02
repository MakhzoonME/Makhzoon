import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type {
  Package,
  PackageLimits,
  PackagePricing,
  PackageAllowances,
  AddOnPrices,
  FeatureKey,
  InclusionKey,
} from '@/types';

type Row = Record<string, unknown>;

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toPackage(r: Row): Package {
  const limits = (r.limits ?? {}) as Partial<PackageLimits>;
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? '',
    isActive: (r.is_active as boolean) ?? true,
    pricing: {
      monthlyPrice: toNumberOrNull(r.monthly_price),
      annualPrice: toNumberOrNull(r.annual_price),
      currency: (r.currency as string) ?? 'USD',
      isCustom: (r.is_custom_pricing as boolean) ?? false,
    },
    trialDays: (r.trial_days as number) ?? 0,
    sortOrder: (r.sort_order as number) ?? 0,
    limits: {
      maxAssets: limits.maxAssets ?? -1,
      maxUsers: limits.maxUsers ?? -1,
      maxWarranties: limits.maxWarranties ?? -1,
      maxRequests: limits.maxRequests ?? -1,
      maxSpaces: limits.maxSpaces ?? -1,
      maxInventoryItems: limits.maxInventoryItems ?? -1,
    },
    features: (r.features ?? {}) as Record<FeatureKey, boolean>,
    inclusions: (r.inclusions ?? {}) as Record<InclusionKey, boolean>,
    allowances: {
      usoolIncluded: toNumberOrNull(r.usool_included),
      raseedIncluded: toNumberOrNull(r.raseed_included),
      purchasesRequestsIncluded: (r.purchases_requests_included as boolean) ?? false,
      harakaIncludedModuleSlots: (r.haraka_included_module_slots as number) ?? 0,
      deliveryAgentsIncluded: (r.delivery_agents_included as boolean) ?? false,
      warrantyCertsIncluded: (r.warranty_certs_included as boolean) ?? false,
      customizationIncluded: (r.customization_included as boolean) ?? false,
      spacesIncluded: toNumberOrNull(r.spaces_included),
      usersIncluded: toNumberOrNull(r.users_included),
      reportsAvailable: (r.reports_available as boolean) ?? false,
    },
    addOnPrices: (r.add_on_prices ?? {}) as import('@/types').AddOnPrices,
    isCustom: (r.is_custom as boolean) ?? false,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy: (r.created_by as string) ?? '',
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy: (r.updated_by as string) ?? '',
  };
}

export async function getPackages(opts?: {
  includeInactive?: boolean;
}): Promise<Package[]> {
  let q = supabaseAdmin
    .from('packages')
    .select('*')
    .order('sort_order')
    .order('name');
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

// Maps the structured allowances onto their snake_case columns. Only defined
// keys are emitted so partial updates don't clobber unrelated columns.
function allowanceColumns(a: Partial<PackageAllowances>): Row {
  const out: Row = {};
  if (a.usoolIncluded !== undefined) out.usool_included = a.usoolIncluded;
  if (a.raseedIncluded !== undefined) out.raseed_included = a.raseedIncluded;
  if (a.purchasesRequestsIncluded !== undefined) out.purchases_requests_included = a.purchasesRequestsIncluded;
  if (a.harakaIncludedModuleSlots !== undefined) out.haraka_included_module_slots = a.harakaIncludedModuleSlots;
  if (a.deliveryAgentsIncluded !== undefined) out.delivery_agents_included = a.deliveryAgentsIncluded;
  if (a.warrantyCertsIncluded !== undefined) out.warranty_certs_included = a.warrantyCertsIncluded;
  if (a.customizationIncluded !== undefined) out.customization_included = a.customizationIncluded;
  if (a.spacesIncluded !== undefined) out.spaces_included = a.spacesIncluded;
  if (a.usersIncluded !== undefined) out.users_included = a.usersIncluded;
  if (a.reportsAvailable !== undefined) out.reports_available = a.reportsAvailable;
  return out;
}

export async function createPackage(
  userId: string,
  payload: {
    name: string;
    description: string;
    isActive: boolean;
    pricing: PackagePricing;
    trialDays: number;
    sortOrder: number;
    limits: PackageLimits;
    features: Record<FeatureKey, boolean>;
    inclusions: Record<InclusionKey, boolean>;
    allowances?: Partial<PackageAllowances>;
    addOnPrices?: AddOnPrices;
    isCustom?: boolean;
  },
): Promise<Package> {
  const { data, error } = await supabaseAdmin
    .from('packages')
    .insert({
      name: payload.name,
      description: payload.description,
      is_active: payload.isActive,
      monthly_price: payload.pricing.monthlyPrice,
      annual_price: payload.pricing.annualPrice,
      currency: payload.pricing.currency,
      is_custom_pricing: payload.pricing.isCustom,
      trial_days: payload.trialDays,
      sort_order: payload.sortOrder,
      limits: payload.limits,
      features: payload.features,
      inclusions: payload.inclusions,
      ...allowanceColumns(payload.allowances ?? {}),
      ...(payload.addOnPrices !== undefined ? { add_on_prices: payload.addOnPrices } : {}),
      ...(payload.isCustom !== undefined ? { is_custom: payload.isCustom } : {}),
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
    Pick<
      Package,
      | 'name'
      | 'description'
      | 'isActive'
      | 'pricing'
      | 'trialDays'
      | 'sortOrder'
      | 'limits'
      | 'features'
      | 'inclusions'
      | 'allowances'
      | 'addOnPrices'
      | 'isCustom'
    >
  >,
): Promise<void> {
  const patch: Row = { updated_by: userId };
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.isActive !== undefined) patch.is_active = updates.isActive;
  if (updates.pricing !== undefined) {
    patch.monthly_price = updates.pricing.monthlyPrice;
    patch.annual_price = updates.pricing.annualPrice;
    patch.currency = updates.pricing.currency;
    patch.is_custom_pricing = updates.pricing.isCustom;
  }
  if (updates.trialDays !== undefined) patch.trial_days = updates.trialDays;
  if (updates.sortOrder !== undefined) patch.sort_order = updates.sortOrder;
  if (updates.limits !== undefined) patch.limits = updates.limits;
  if (updates.features !== undefined) patch.features = updates.features;
  if (updates.inclusions !== undefined) patch.inclusions = updates.inclusions;
  if (updates.allowances !== undefined) Object.assign(patch, allowanceColumns(updates.allowances));
  if (updates.addOnPrices !== undefined) patch.add_on_prices = updates.addOnPrices;
  if (updates.isCustom !== undefined) patch.is_custom = updates.isCustom;
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
