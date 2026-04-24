import { adminDb } from '@/lib/firebase/admin';
import { OrgUsage } from '@/types';

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
