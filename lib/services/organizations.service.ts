import { AuthUser } from '@/types/auth.types';
import {
  getOrganizationById,
  updateOrganization as dbUpdateOrganization,
} from '@/lib/db/organizations';
import { getOrCreateOrganizationConfig } from '@/lib/db/organization-configs';
import { getSubscriptionByOrg } from '@/lib/db/subscriptions';
import { queueAuditLog } from '@/lib/audit/logger';
import { getUserContext } from './base.service';

export interface UpdateOrganizationInput {
  name?: string;
  description?: string;
  contactEmail?: string;
  category?: 'Technology' | 'Healthcare' | 'Finance' | 'Retail' | 'Manufacturing' | 'Education' | 'Government' | 'Non-Profit' | 'Other';
}

export interface UpdateOrgConfigInput {
  assetStatuses?: Array<{ id: string; label: string; color: string }>;
  locations?: Array<{ id: string; name: string }>;
  categories?: Array<{ id: string; name: string }>;
}

export async function getOrgDetails(user: AuthUser) {
  if (!user.organizationId) throw new Error('User has no organization');
  const org = await getOrganizationById(user.organizationId);
  if (!org) throw new Error('Organization not found');
  return org;
}

export async function getOrgSubscription(user: AuthUser) {
  if (!user.organizationId) throw new Error('User has no organization');
  const sub = await getSubscriptionByOrg(user.organizationId);
  return sub;
}

export async function getOrgConfigDetails(user: AuthUser) {
  if (!user.organizationId) throw new Error('User has no organization');
  return getOrCreateOrganizationConfig(user.organizationId, user.uid);
}

export async function updateOrganizationWithAudit(
  user: AuthUser,
  data: UpdateOrganizationInput
) {
  if (!user.organizationId) throw new Error('User has no organization');

  const org = await getOrganizationById(user.organizationId);
  if (!org) throw new Error('Organization not found');

  const userContext = getUserContext(user);
  await dbUpdateOrganization(user.organizationId, data);

  queueAuditLog({
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
    newValue: data as unknown as Record<string, unknown>,
  });
}

export async function updateOrgConfigWithAudit(
  user: AuthUser,
  data: UpdateOrgConfigInput
) {
  if (!user.organizationId) throw new Error('User has no organization');

  const config = await getOrCreateOrganizationConfig(user.organizationId, user.uid);

  const userContext = getUserContext(user);
  // Note: Individual config sections (statuses, locations, categories) are updated
  // via their respective database functions. This audit log captures the intent.

  queueAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'ORG_CONFIG_UPDATED',
    module: 'organizations',
    recordId: user.organizationId,
    oldValue: config as unknown as Record<string, unknown>,
    newValue: data as unknown as Record<string, unknown>,
  });
}
