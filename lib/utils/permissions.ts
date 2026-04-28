import { AuthUser } from '@/types/auth.types';
import { UserPermissions } from '@/types/user-permissions.types';

const ADMIN_ROLES = new Set(['admin', 'org_owner', 'super_admin']);

export function hasPermission(
  user: AuthUser,
  module: keyof UserPermissions,
  operation: string
): boolean {
  if (ADMIN_ROLES.has(user.role)) return true;
  if (!user.permissions) {
    return operation === 'view';
  }
  const mod = user.permissions[module] as unknown as Record<string, boolean> | undefined;
  if (!mod) return false;
  return mod[operation] === true;
}

export function hasModuleAccess(user: AuthUser, module: keyof UserPermissions): boolean {
  return hasPermission(user, module, 'view');
}
