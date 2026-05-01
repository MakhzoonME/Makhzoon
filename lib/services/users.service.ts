import { AuthUser } from '@/types/auth.types';
import {
  getUsers,
  getUserById,
  updateUser as dbUpdateUser,
} from '@/lib/db/users';
import {
  getInviteByToken,
  revokeInvite as dbRevokeInvite,
} from '@/lib/db/invites';
import { queueAuditLog } from '@/lib/audit/logger';
import { requirePermission, getUserContext } from './base.service';

export interface UpdateUserInput {
  displayName?: string;
  permissions?: Record<string, Record<string, boolean>> | null;
}

export async function getOrgUsers(user: AuthUser) {
  if (!user.organizationId) throw new Error('User has no organization');
  await requirePermission(user, 'users', 'view');
  return getUsers(user.organizationId);
}

export async function getOrgUser(user: AuthUser, userId: string) {
  if (!user.organizationId) throw new Error('User has no organization');
  await requirePermission(user, 'users', 'view');
  const target = await getUserById(userId);
  if (!target || target.organizationId !== user.organizationId) {
    throw new Error('User not found');
  }
  return target;
}

export async function updateUserWithAudit(
  user: AuthUser,
  userId: string,
  data: UpdateUserInput
) {
  if (!user.organizationId) throw new Error('User has no organization');
  await requirePermission(user, 'users', 'update');

  const target = await getUserById(userId);
  if (!target || target.organizationId !== user.organizationId) {
    throw new Error('User not found');
  }

  const userContext = getUserContext(user);
  await dbUpdateUser(userId, data as never);

  queueAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'USER_UPDATED',
    module: 'users',
    recordId: userId,
    oldValue: { displayName: target.displayName, permissions: target.permissions } as Record<string, unknown>,
    newValue: data as unknown as Record<string, unknown>,
  });
}

export async function deactivateUserWithAudit(user: AuthUser, userId: string) {
  if (!user.organizationId) throw new Error('User has no organization');
  await requirePermission(user, 'users', 'delete');

  const target = await getUserById(userId);
  if (!target || target.organizationId !== user.organizationId) {
    throw new Error('User not found');
  }

  const userContext = getUserContext(user);
  await dbUpdateUser(userId, { status: 'deactivated' } as never);

  queueAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'USER_DEACTIVATED',
    module: 'users',
    recordId: userId,
    oldValue: { status: target.status },
    newValue: { status: 'deactivated' },
  });
}

export async function revokeUserInviteWithAudit(user: AuthUser, token: string) {
  if (!user.organizationId) throw new Error('User has no organization');
  await requirePermission(user, 'users', 'delete');

  const invite = await getInviteByToken(token);
  if (!invite || invite.organizationId !== user.organizationId) {
    throw new Error('Invite not found');
  }

  const userContext = getUserContext(user);
  await dbRevokeInvite(invite.id, userContext.uid);

  queueAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'INVITE_REVOKED',
    module: 'users',
    newValue: { email: invite.email },
  });
}
