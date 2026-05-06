import { NextResponse } from 'next/server';
import {
  getUsers,
  getUserById,
  updateUser as dbUpdateUser,
} from '@/lib/db/users';
import {
  getInviteByToken,
  revokeInvite as dbRevokeInvite,
} from '@/lib/db/invites';
import { hasPermission } from '@/lib/platform/permissions';
import { auditLog } from '@/lib/platform/audit';
import type { TenantContext } from '@/lib/platform/tenancy/types';

export interface UpdateUserInput {
  displayName?: string;
  role?: string;
  permissions?: Record<string, Record<string, boolean>> | null;
}

export async function getAll(tenant: TenantContext) {
  if (!hasPermission(tenant, 'settings', 'users'))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return getUsers(tenant.organizationId);
}

export async function getById(tenant: TenantContext, userId: string) {
  if (!hasPermission(tenant, 'settings', 'users'))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const target = await getUserById(userId);
  if (!target || target.organizationId !== tenant.organizationId)
    throw NextResponse.json({ error: 'User not found' }, { status: 404 });
  return target;
}

export async function update(tenant: TenantContext, userId: string, data: UpdateUserInput) {
  if (!hasPermission(tenant, 'settings', 'users'))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const target = await getUserById(userId);
  if (!target || target.organizationId !== tenant.organizationId)
    throw NextResponse.json({ error: 'User not found' }, { status: 404 });

  await dbUpdateUser(userId, { ...data, updatedBy: tenant.userId } as never);

  auditLog.queue({
    tenant,
    action: 'USER_UPDATED',
    module: 'users',
    recordId: userId,
    oldValue: { displayName: target.displayName, permissions: target.permissions } as Record<string, unknown>,
    newValue: data as unknown as Record<string, unknown>,
  });
}

export async function deactivate(tenant: TenantContext, userId: string) {
  if (!hasPermission(tenant, 'settings', 'users'))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const target = await getUserById(userId);
  if (!target || target.organizationId !== tenant.organizationId)
    throw NextResponse.json({ error: 'User not found' }, { status: 404 });

  await dbUpdateUser(userId, { status: 'deactivated', updatedBy: tenant.userId } as never);

  auditLog.queue({
    tenant,
    action: 'USER_DEACTIVATED',
    module: 'users',
    recordId: userId,
    oldValue: { status: target.status },
    newValue: { status: 'deactivated' },
  });
}

export async function revokeInvite(tenant: TenantContext, token: string) {
  if (!hasPermission(tenant, 'settings', 'users'))
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const invite = await getInviteByToken(token);
  if (!invite || invite.organizationId !== tenant.organizationId)
    throw NextResponse.json({ error: 'Invite not found' }, { status: 404 });

  await dbRevokeInvite(invite.id, tenant.userId);

  auditLog.queue({
    tenant,
    action: 'INVITE_REVOKED',
    module: 'users',
    recordId: invite.id,
    oldValue: { email: invite.email, role: invite.role },
  });
}
