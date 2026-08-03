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
    if (!mod) {
      // Module block absent entirely — fall back to role default
      return ADMIN_ROLES.has(user.role);
    }
    const val = mod[operation];
    // Key missing (new field added after permissions were saved) — admin roles
    // should not lose access to new operations they never explicitly restricted.
    if (val === undefined) return ADMIN_ROLES.has(user.role);
    return val === true;
  }
  // No stored permissions: admin/owner get full access, staff get view-only fallback
  if (ADMIN_ROLES.has(user.role)) return true;
  return operation === 'view';
}

export function hasModuleAccess(user: AuthUser, module: keyof UserPermissions): boolean {
  // A module is reachable as soon as the user holds ANY granted operation
  // within it — 'view' is just one specific permission among many (e.g.
  // 'haraka.view' gates only the Haraka dashboard sub-page), not a master
  // switch. A user with only e.g. haraka.sessionsView should still be able
  // to reach the Haraka section.
  const mod = user.permissions?.[module] as unknown as Record<string, boolean> | undefined;
  if (mod) {
    return Object.values(mod).some((v) => v === true);
  }
  return hasPermission(user, module, 'view');
}

/** Resolve a dot-separated key like 'settingsOrgInfo.view' against user.permissions */
export function hasPermByKey(user: AuthUser, permissionKey: string): boolean {
  const [module, operation] = permissionKey.split('.');
  if (!module || !operation) return false;
  return hasPermission(user, module as keyof UserPermissions, operation);
}
