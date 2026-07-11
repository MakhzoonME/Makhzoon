import { AuthUser } from '@/types/auth.types';
import {
  SuperAdminPermissions,
  DEFAULT_SUPER_ADMIN_PERMISSIONS,
  DEFAULT_MAKHZOON_ADMIN_PERMISSIONS,
  DEFAULT_SUPPORT_PERMISSIONS,
} from '@/types/superadmin-permissions.types';

const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);

function getRoleDefaults(role: string): SuperAdminPermissions {
  if (role === 'super_admin') return DEFAULT_SUPER_ADMIN_PERMISSIONS;
  if (role === 'makhzoon_admin') return DEFAULT_MAKHZOON_ADMIN_PERMISSIONS;
  if (role === 'makhzoon_support') return DEFAULT_SUPPORT_PERMISSIONS;
  return {
    organizations: { view: false, create: false, update: false, delete: false },
    support:       { view: false, respond: false, close: false },
    configuration: { view: false, edit: false },
    auditLogs:     { view: false },
    team:          { view: false, manage: false },
    backendLogs:   { view: false },
  };
}

/**
 * Check a superadmin platform permission.
 * Uses stored saPermissions when present; falls back to role defaults.
 * Returns false for non-superadmin roles.
 */
export function hasSuperAdminPermission(
  user: AuthUser,
  module: keyof SuperAdminPermissions,
  operation: string,
): boolean {
  if (!SUPERADMIN_ROLES.has(user.role)) return false;

  const perms: SuperAdminPermissions = user.saPermissions ?? getRoleDefaults(user.role);
  const mod = perms[module] as unknown as Record<string, boolean> | undefined;
  return mod?.[operation] === true;
}
