import { AuthUser } from '@/types/auth.types';
import {
  getOrganization,
  updateOrganization as dbUpdateOrganization,
  getOrgConfig,
  updateOrgConfig as dbUpdateOrgConfig,
} from '@/lib/db/organizations';
import { getSubscriptionByOrg } from '@/lib/db/subscriptions';
import { writeAuditLog } from '@/lib/audit/logger';
import { requirePermission, getUserContext } from './base.service';

export interface UpdateOrganizationInput {
  name?: string;
  description?: string;
  contactEmail?: string;
  category?: string;
}

export interface UpdateOrgConfigInput {
  assetStatuses?: Array<{ id: string; label: string; color: string }>;
  locations?: Array<{ id: string; name: string }>;
  categories?: Array<{ id: string; name: string }>;
}

export async function getOrgDetails(user: AuthUser) {
  const org = await getOrganization(user.organizationId);
  if (!org) throw new Error('Organization not found');
  return org;
}

export async function getOrgSubscription(user: AuthUser) {
  const sub = await getSubscriptionByOrg(user.organizationId);
  return sub;
}

export async function getOrgConfigDetails(user: AuthUser) {
  return getOrgConfig(user.organizationId);
}

export async function updateOrganizationWithAudit(
  user: AuthUser,
  data: UpdateOrganizationInput
) {
  await requirePermission(user, 'organizations', 'update');

  const org = await getOrganization(user.organizationId);
  if (!org) throw new Error('Organization not found');

  const userContext = getUserContext(user);
  await dbUpdateOrganization(user.organizationId, data);

  await writeAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'ORGANIZATION_UPDATED',
    module: 'organizations',
    recordId: user.organizationId,
    oldValue: {
      name: org.name,
      description: org.description,
      contactEmail: org.contactEmail,
      category: org.category,
    },
    newValue: data,
  });
}

export async function updateOrgConfigWithAudit(
  user: AuthUser,
  data: UpdateOrgConfigInput
) {
  await requirePermission(user, 'organizations', 'update');

  const config = await getOrgConfig(user.organizationId);

  const userContext = getUserContext(user);
  await dbUpdateOrgConfig(user.organizationId, data);

  await writeAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'ORG_CONFIG_UPDATED',
    module: 'organizations',
    recordId: user.organizationId,
    oldValue: config,
    newValue: data,
  });
}
