import { adminDb } from '@/lib/firebase/admin';
import type { OrgUsage, OrgWithUsage } from '@/types';
import { getOrganizationsWithSearch } from './organizations';
import { getSubscriptionsByOrgs } from './subscriptions';
import { getPackagesByIds } from './packages';

export async function getOrgUsage(orgId: string): Promise<OrgUsage> {
  const [assets, users, warranties, requests] = await Promise.all([
    adminDb.collection('assets').where('organizationId', '==', orgId).count().get(),
    adminDb.collection('users').where('organizationId', '==', orgId).count().get(),
    adminDb.collection('warranties').where('organizationId', '==', orgId).count().get(),
    adminDb.collection('requests').where('organizationId', '==', orgId).count().get(),
  ]);
  return {
    organizationId: orgId,
    assets: assets.data().count,
    users: users.data().count,
    warranties: warranties.data().count,
    requests: requests.data().count,
  };
}

export async function getAllOrgsUsage(orgIds: string[]): Promise<OrgUsage[]> {
  if (orgIds.length === 0) return [];
  return Promise.all(orgIds.map((id) => getOrgUsage(id)));
}

export async function getAllOrgsWithUsage(filters?: {
  search?: string;
  category?: string;
}): Promise<OrgWithUsage[]> {
  const orgs = await getOrganizationsWithSearch(filters);
  if (orgs.length === 0) return [];

  const orgIds = orgs.map((o) => o.id);
  const [subscriptions, usages] = await Promise.all([
    getSubscriptionsByOrgs(orgIds),
    getAllOrgsUsage(orgIds),
  ]);

  const packageIds = subscriptions
    .map((s) => s.packageId)
    .filter((id): id is string => !!id);
  const packages = await getPackagesByIds(packageIds);
  const packageById = new Map(packages.map((p) => [p.id, p]));
  const subByOrg = new Map(subscriptions.map((s) => [s.organizationId, s]));
  const usageByOrg = new Map(usages.map((u) => [u.organizationId, u]));

  return orgs.map((org) => {
    const sub = subByOrg.get(org.id) ?? null;
    return {
      organization: org,
      subscription: sub,
      package: sub?.packageId ? packageById.get(sub.packageId) ?? null : null,
      usage: usageByOrg.get(org.id) ?? {
        organizationId: org.id,
        assets: 0,
        users: 0,
        warranties: 0,
        requests: 0,
      },
    };
  });
}
