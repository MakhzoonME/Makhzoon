import { AuthUser } from '@/types/auth.types';
import {
  getUsers,
  getUserById,
  updateUser as dbUpdateUser,
  deactivateUser as dbDeactivateUser,
  createInvite as dbCreateInvite,
  getInviteByToken,
  revokeInvite as dbRevokeInvite,
} from '@/lib/db/users';
import { writeAuditLog } from '@/lib/audit/logger';
import { requirePermission, getUserContext } from './base.service';

export interface UpdateUserInput {
  displayName?: string;
  permissions?: Record<string, Record<string, boolean>> | null;
}

export interface CreateInviteInput {
  email: string;
  role: 'admin' | 'staff';
}

export async function getOrgUsers(user: AuthUser) {
  await requirePermission(user, 'users', 'view');
  return getUsers(user.organizationId);
}

export async function getOrgUser(user: AuthUser, userId: string) {
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
  await requirePermission(user, 'users', 'update');

  const target = await getUserById(userId);
  if (!target || target.organizationId !== user.organizationId) {
    throw new Error('User not found');
  }

  const userContext = getUserContext(user);
  await dbUpdateUser(userId, data);

  await writeAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'USER_UPDATED',
    module: 'users',
    recordId: userId,
    oldValue: { displayName: target.displayName, permissions: target.permissions },
    newValue: data,
  });
}

export async function deactivateUserWithAudit(user: AuthUser, userId: string) {
  await requirePermission(user, 'users', 'delete');

  const target = await getUserById(userId);
  if (!target || target.organizationId !== user.organizationId) {
    throw new Error('User not found');
  }

  const userContext = getUserContext(user);
  await dbDeactivateUser(userId);

  await writeAuditLog({
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

export async function createUserInviteWithAudit(user: AuthUser, data: CreateInviteInput) {
  await requirePermission(user, 'users', 'create');

  const userContext = getUserContext(user);
  const token = await dbCreateInvite({
    organizationId: user.organizationId,
    email: data.email,
    role: data.role,
    createdBy: userContext.uid,
  });

  await writeAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'USER_INVITED',
    module: 'users',
    newValue: { email: data.email, role: data.role },
  });

  return { token };
}

export async function revokeUserInviteWithAudit(user: AuthUser, token: string) {
  await requirePermission(user, 'users', 'delete');

  const invite = await getInviteByToken(token);
  if (!invite || invite.organizationId !== user.organizationId) {
    throw new Error('Invite not found');
  }

  const userContext = getUserContext(user);
  await dbRevokeInvite(token);

  await writeAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'INVITE_REVOKED',
    module: 'users',
    newValue: { email: invite.email },
  });
}
