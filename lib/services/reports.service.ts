import { AuthUser } from '@/types/auth.types';
import { getReports } from '@/lib/db/reports';
import { requirePermission } from './base.service';

export async function getOrgReports(user: AuthUser) {
  await requirePermission(user, 'reports', 'view');
  return getReports(user.organizationId);
}
