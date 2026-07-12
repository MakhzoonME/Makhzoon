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
  // The pos module has no 'view' gate — any granted operation implies module
  // access (a receptionist with only view_reception, a cashier with only
  // process_sale). Without this, hasPermission('pos','view') hits the
  // missing-key admin fallback and locks out ALL staff.
  if (module === 'pos' && user.permissions?.pos) {
    return Object.values(user.permissions.pos).some((v) => v === true);
  }
  return hasPermission(user, module, 'view');
}

/** Resolve a dot-separated key like 'settings.orgInfo' against user.permissions */
export function hasPermByKey(user: AuthUser, permissionKey: string): boolean {
  const [module, operation] = permissionKey.split('.');
  if (!module || !operation) return false;
  return hasPermission(user, module as keyof UserPermissions, operation);
}
