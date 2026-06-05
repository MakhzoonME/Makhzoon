import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ReportsResponse } from '@/types/report.types';

type Row = Record<string, unknown>;

function toDate(v: unknown): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  const d = new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function getReportsForOrg(
  orgId: string,
  spaceId?: string,
): Promise<ReportsResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sp = (q: any) => (spaceId ? q.eq('space_id', spaceId) : q);
  const [assets, checkouts, warranties, pendingReqs, maintenance] =
    await Promise.all([
      sp(supabaseAdmin.from('assets').select('*').eq('organization_id', orgId)),
      sp(supabaseAdmin.from('asset_checkouts').select('*').eq('organization_id', orgId)),
      sp(supabaseAdmin.from('warranties').select('end_date').eq('organization_id', orgId)),
      sp(supabaseAdmin.from('requests').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'PENDING')),
      sp(supabaseAdmin.from('maintenance_records').select('*').eq('organization_id', orgId)),
    ]);

  const assetRows = (assets.data ?? []) as Row[];
  const checkoutRows = (checkouts.data ?? []) as Row[];
  const warrantyRows = (warranties.data ?? []) as Row[];
  const maintenanceRows = (maintenance.data ?? []) as Row[];

  let totalAssets = 0;
  let activeAssets = 0;
  let retiredAssets = 0;
  let totalValue = 0;
  const categoryMap = new Map<string, { count: number; value: number }>();
  const locationMap = new Map<string, number>();
  const activeAssetIds = new Set<string>();

  for (const a of assetRows) {
    totalAssets++;
    if (a.status === 'Retired') retiredAssets++;
    else {
      activeAssets++;
      activeAssetIds.add(a.id as string);
    }
    const cost = Number(a.purchase_cost) || 0;
    totalValue += cost;

    const cat = (a.category as string) || 'Uncategorized';
    const c = categoryMap.get(cat) ?? { count: 0, value: 0 };
    c.count++;
    c.value += cost;
    categoryMap.set(cat, c);

    const loc = (a.location as string) || 'Unassigned';
    locationMap.set(loc, (locationMap.get(loc) ?? 0) + 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let activeCheckouts = 0;
  let overdueCheckouts = 0;
  for (const c of checkoutRows) {
    if (!activeAssetIds.has(c.asset_id as string)) continue;
    if (c.returned_at) continue;
    activeCheckouts++;
    const due = toDate(c.due_date);
    if (due && due < today) overdueCheckouts++;
  }

  const soon = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  let warrantiesExpiringSoon = 0;
  for (const w of warrantyRows) {
    const end = toDate(w.end_date);
    if (end && end >= today && end <= soon) warrantiesExpiringSoon++;
  }

  let maintenanceCost = 0;
  let maintenanceCount = 0;
  const monthMap = new Map<string, { cost: number; count: number }>();
  for (const m of maintenanceRows) {
    if (!activeAssetIds.has(m.asset_id as string)) continue;
    const cost = Number(m.cost) || 0;
    maintenanceCost += cost;
    maintenanceCount++;
    const date = toDate(m.date) ?? toDate(m.created_at) ?? new Date();
    const key = monthKey(date);
    const entry = monthMap.get(key) ?? { cost: 0, count: 0 };
    entry.cost += cost;
    entry.count++;
    monthMap.set(key, entry);
  }

  const maintenanceByMonth = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, v]) => ({ month, cost: v.cost, count: v.count }));

  const categories = Array.from(categoryMap.entries())
    .map(([category, v]) => ({ category, count: v.count, value: v.value }))
    .sort((a, b) => b.count - a.count);

  const locations = Array.from(locationMap.entries())
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count);

  return {
    summary: {
      totalAssets,
      activeAssets,
      retiredAssets,
      totalValue,
      activeCheckouts,
      overdueCheckouts,
      warrantiesExpiringSoon,
      openRequests: pendingReqs.count ?? 0,
      maintenanceCost,
      maintenanceCount,
    },
    categories,
    locations,
    maintenanceByMonth,
  };
}
