import { adminDb } from '@/lib/firebase/admin';
import { ReportsResponse } from '@/types/report.types';
import { Timestamp } from 'firebase-admin/firestore';

function toDate(v: unknown): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  const d = new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function getReportsForOrg(orgId: string): Promise<ReportsResponse> {
  const [assetsSnap, checkoutsSnap, warrantiesSnap, requestsSnap, maintenanceSnap] = await Promise.all([
    adminDb.collection('assets').where('organizationId', '==', orgId).get(),
    adminDb.collection('assetCheckouts').where('organizationId', '==', orgId).get(),
    adminDb.collection('warranties').where('organizationId', '==', orgId).get(),
    adminDb.collection('requests').where('organizationId', '==', orgId).where('status', '==', 'PENDING').get(),
    adminDb.collection('maintenanceRecords').where('organizationId', '==', orgId).get(),
  ]);

  let totalAssets = 0;
  let activeAssets = 0;
  let retiredAssets = 0;
  let totalValue = 0;
  const categoryMap = new Map<string, { count: number; value: number }>();
  const locationMap = new Map<string, number>();
  const activeAssetIds = new Set<string>();

  assetsSnap.docs.forEach((d) => {
    const a = d.data();
    totalAssets++;
    if (a.status === 'Retired') retiredAssets++;
    else {
      activeAssets++;
      activeAssetIds.add(d.id);
    }
    const cost = Number(a.purchaseCost) || 0;
    totalValue += cost;

    const cat = (a.category as string) || 'Uncategorized';
    const c = categoryMap.get(cat) ?? { count: 0, value: 0 };
    c.count++;
    c.value += cost;
    categoryMap.set(cat, c);

    const loc = (a.location as string) || 'Unassigned';
    locationMap.set(loc, (locationMap.get(loc) ?? 0) + 1);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let activeCheckouts = 0;
  let overdueCheckouts = 0;
  checkoutsSnap.docs.forEach((d) => {
    const c = d.data();
    if (!activeAssetIds.has(c.assetId)) return;
    if (c.returnedAt) return;
    activeCheckouts++;
    const due = toDate(c.dueDate);
    if (due && due < today) overdueCheckouts++;
  });

  const soon = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  let warrantiesExpiringSoon = 0;
  warrantiesSnap.docs.forEach((d) => {
    const end = toDate(d.data().endDate);
    if (end && end >= today && end <= soon) warrantiesExpiringSoon++;
  });

  let maintenanceCost = 0;
  let maintenanceCount = 0;
  const monthMap = new Map<string, { cost: number; count: number }>();
  maintenanceSnap.docs.forEach((d) => {
    const m = d.data();
    if (!activeAssetIds.has(m.assetId)) return;
    const cost = Number(m.cost) || 0;
    maintenanceCost += cost;
    maintenanceCount++;
    const date = toDate(m.date) ?? toDate(m.createdAt) ?? new Date();
    const key = monthKey(date);
    const entry = monthMap.get(key) ?? { cost: 0, count: 0 };
    entry.cost += cost;
    entry.count++;
    monthMap.set(key, entry);
  });

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
      openRequests: requestsSnap.size,
      maintenanceCost,
      maintenanceCount,
    },
    categories,
    locations,
    maintenanceByMonth,
  };
}
