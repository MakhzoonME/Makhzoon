import { AuthUser } from '@/types/auth.types';
import { UserPermissions } from '@/types/user-permissions.types';

// Roles that receive full access when no per-user permissions are stored:
// org-level owners/admins, plus the platform superadmin family (who get full
// access to any org they enter via the transferOrgId cookie — see auth-helpers).
const ADMIN_ROLES = new Set([
  'admin',
  'org_owner',
  'super_admin',
  'makhzoon_admin',
  'makhzoon_support',
]);

export function hasPermission(
  user: AuthUser,
  module: keyof UserPermissions,
  operation: string
): boolean {
  // Stored permissions always take precedence — enables restriction of any role
  if (user.permissions) {
    const mod = user.permissions[module] as unknown as Record<string, boolean> | undefined;
    if (!mod) return false;
    return mod[operation] === true;
  }
  // No stored permissions: admin/owner get full access, staff get view-only fallback
  if (ADMIN_ROLES.has(user.role)) return true;
  return operation === 'view';
}

export function hasModuleAccess(user: AuthUser, module: keyof UserPermissions): boolean {
  return hasPermission(user, module, 'view');
}

/** Resolve a dot-separated key like 'settings.orgInfo' against user.permissions */
export function hasPermByKey(user: AuthUser, permissionKey: string): boolean {
  const [module, operation] = permissionKey.split('.');
  if (!module || !operation) return false;
  return hasPermission(user, module as keyof UserPermissions, operation);
}
