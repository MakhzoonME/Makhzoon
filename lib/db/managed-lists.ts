import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type {
  ListKey,
  PlatformListItem,
  OrgListItem,
  ResolvedListItem,
} from '@/types';

// Config-driven dropdown lists (migration 0008). Server reads/writes use the
// service-role client (RLS-bypass); callers enforce role/scope. Mirrors the
// canonical lib/db pattern (see organizations.ts).

type Row = Record<string, unknown>;

function toPlatform(r: Row): PlatformListItem {
  return {
    id: r.id as string,
    listKey: r.list_key as ListKey,
    value: r.value as string,
    label: r.label as string,
    labelAr: (r.label_ar as string) ?? null,
    color: (r.color as string) ?? null,
    sortOrder: (r.sort_order as number) ?? 0,
    enabled: r.enabled as boolean,
    isSystem: r.is_system as boolean,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy: (r.created_by as string) ?? null,
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy: (r.updated_by as string) ?? null,
  };
}

function toOrg(r: Row): OrgListItem {
  return {
    id: r.id as string,
    organizationId: r.organization_id as string,
    listKey: r.list_key as ListKey,
    value: r.value as string,
    label: (r.label as string) ?? null,
    labelAr: (r.label_ar as string) ?? null,
    color: (r.color as string) ?? null,
    sortOrder: (r.sort_order as number) ?? null,
    enabled: r.enabled as boolean,
    isCustom: r.is_custom as boolean,
    createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
    createdBy: (r.created_by as string) ?? null,
    updatedAt: r.updated_at ? new Date(r.updated_at as string) : new Date(),
    updatedBy: (r.updated_by as string) ?? null,
  };
}

// ── Platform catalog (superadmin) ─────────────────────────────────────────
export async function getPlatformListItems(
  listKey?: ListKey,
): Promise<PlatformListItem[]> {
  let q = supabaseAdmin
    .from('platform_list_items')
    .select('*')
    .order('list_key', { ascending: true })
    .order('sort_order', { ascending: true });
  if (listKey) q = q.eq('list_key', listKey);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(toPlatform);
}

export async function getPlatformListItemById(
  id: string,
): Promise<PlatformListItem | null> {
  const { data } = await supabaseAdmin
    .from('platform_list_items')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data ? toPlatform(data) : null;
}

export async function createPlatformListItem(input: {
  listKey: ListKey;
  value: string;
  label: string;
  labelAr?: string | null;
  color?: string | null;
  sortOrder?: number;
  enabled?: boolean;
  isSystem?: boolean;
  userId?: string;
}): Promise<PlatformListItem> {
  const { data, error } = await supabaseAdmin
    .from('platform_list_items')
    .insert({
      list_key: input.listKey,
      value: input.value,
      label: input.label,
      label_ar: input.labelAr ?? null,
      color: input.color ?? null,
      sort_order: input.sortOrder ?? 0,
      enabled: input.enabled ?? true,
      is_system: input.isSystem ?? false,
      created_by: input.userId ?? null,
      updated_by: input.userId ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return toPlatform(data);
}

export async function updatePlatformListItem(
  id: string,
  patch: {
    label?: string;
    labelAr?: string | null;
    color?: string | null;
    sortOrder?: number;
    enabled?: boolean;
    value?: string;
    userId?: string;
  },
): Promise<void> {
  const attrs: Row = { updated_by: patch.userId ?? null };
  if (patch.label !== undefined) attrs.label = patch.label;
  if (patch.labelAr !== undefined) attrs.label_ar = patch.labelAr;
  if (patch.color !== undefined) attrs.color = patch.color;
  if (patch.sortOrder !== undefined) attrs.sort_order = patch.sortOrder;
  if (patch.enabled !== undefined) attrs.enabled = patch.enabled;
  if (patch.value !== undefined) attrs.value = patch.value;
  const { error } = await supabaseAdmin
    .from('platform_list_items')
    .update(attrs)
    .eq('id', id);
  if (error) throw error;
}

export async function deletePlatformListItem(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('platform_list_items')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Org overrides/additions ───────────────────────────────────────────────
export async function getOrgListItems(
  orgId: string,
  listKey?: ListKey,
): Promise<OrgListItem[]> {
  let q = supabaseAdmin
    .from('org_list_items')
    .select('*')
    .eq('organization_id', orgId);
  if (listKey) q = q.eq('list_key', listKey);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(toOrg);
}

/** Insert or update an org's row for (list_key, value). */
export async function upsertOrgListItem(input: {
  organizationId: string;
  listKey: ListKey;
  value: string;
  label?: string | null;
  labelAr?: string | null;
  color?: string | null;
  sortOrder?: number | null;
  enabled?: boolean;
  isCustom?: boolean;
  userId?: string;
}): Promise<void> {
  const { error } = await supabaseAdmin.from('org_list_items').upsert(
    {
      organization_id: input.organizationId,
      list_key: input.listKey,
      value: input.value,
      label: input.label ?? null,
      label_ar: input.labelAr ?? null,
      color: input.color ?? null,
      sort_order: input.sortOrder ?? null,
      enabled: input.enabled ?? true,
      is_custom: input.isCustom ?? true,
      updated_by: input.userId ?? null,
    },
    { onConflict: 'organization_id,list_key,value' },
  );
  if (error) throw error;
}

export async function deleteOrgListItem(
  orgId: string,
  listKey: ListKey,
  value: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('org_list_items')
    .delete()
    .eq('organization_id', orgId)
    .eq('list_key', listKey)
    .eq('value', value);
  if (error) throw error;
}

// ── Resolver: effective list an org sees ──────────────────────────────────
// platform defaults (enabled) + org overrides (relabel/recolor/reorder/hide)
// + org custom additions, sorted by effective sort_order then label.
export async function resolveListForOrg(
  orgId: string,
  listKey: ListKey,
): Promise<ResolvedListItem[]> {
  const [platform, org] = await Promise.all([
    getPlatformListItems(listKey),
    getOrgListItems(orgId, listKey),
  ]);

  const orgByValue = new Map(org.map((o) => [o.value, o]));
  const sortMap = new Map<string, number>();
  const out: ResolvedListItem[] = [];

  // Platform defaults, with any org override applied.
  for (const p of platform) {
    if (!p.enabled) continue;
    const o = orgByValue.get(p.value);
    if (o && !o.enabled) continue; // org hid this default
    out.push({
      value: p.value,
      label: o?.label ?? p.label,
      labelAr: o?.labelAr ?? p.labelAr,
      color: o?.color ?? p.color,
      isSystem: p.isSystem,
      isCustom: !!o,
    });
    sortMap.set(p.value, o?.sortOrder ?? p.sortOrder);
  }

  // Org-only custom additions (no matching platform value).
  for (const o of org) {
    if (platform.some((p) => p.value === o.value)) continue;
    if (!o.enabled) continue;
    out.push({
      value: o.value,
      label: o.label ?? o.value,
      labelAr: o.labelAr,
      color: o.color,
      isSystem: false,
      isCustom: true,
    });
    sortMap.set(o.value, o.sortOrder ?? 999);
  }

  return out.sort((a, b) => {
    const sa = sortMap.get(a.value) ?? 0;
    const sb = sortMap.get(b.value) ?? 0;
    return sa - sb || a.label.localeCompare(b.label);
  });
}
