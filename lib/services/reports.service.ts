import { AuthUser } from '@/types/auth.types';
import { getReportsForOrg } from '@/lib/db/reports';
import { requirePermission } from './base.service';

export async function getOrgReports(user: AuthUser) {
  await requirePermission(user, 'reports', 'view');
  if (!user.organizationId) throw new Error('User has no organization');
  return getReportsForOrg(user.organizationId);
}
