import { AuthUser } from '@/types/auth.types';
import {
  SuperAdminPermissions,
  DEFAULT_SUPER_ADMIN_PERMISSIONS,
  DEFAULT_MAKHZOON_ADMIN_PERMISSIONS,
  DEFAULT_SUPPORT_PERMISSIONS,
} from '@/types/superadmin-permissions.types';

const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);

const NO_PERMISSIONS: SuperAdminPermissions = {
  organizations: { view: false, create: false, update: false, delete: false },
  support:       { view: false, respond: false, close: false },
  configuration: { view: false, edit: false },
  auditLogs:     { view: false },
  team:          { view: false, manage: false },
  backendLogs:   { view: false },
  database:      { view: false, edit: false, delete: false },
};

function getRoleDefaults(role: string): SuperAdminPermissions {
  if (role === 'super_admin') return DEFAULT_SUPER_ADMIN_PERMISSIONS;
  if (role === 'makhzoon_admin') return DEFAULT_MAKHZOON_ADMIN_PERMISSIONS;
  if (role === 'makhzoon_support') return DEFAULT_SUPPORT_PERMISSIONS;
  return NO_PERMISSIONS;
}

/**
 * Deep-merge stored per-user permissions over the role defaults, so a key that
 * is missing from a stored (possibly partial/stale) object falls back to the
 * role default instead of silently reading as `false`. Explicitly-stored values
 * always win. Only the known modules/operations from the defaults are consulted.
 */
function mergeOverDefaults(
  defaults: SuperAdminPermissions,
  stored: SuperAdminPermissions | null | undefined,
): SuperAdminPermissions {
  if (!stored) return defaults;
  const out = {} as Record<string, Record<string, boolean>>;
  for (const [mod, ops] of Object.entries(defaults)) {
    const storedMod = (stored as unknown as Record<string, Record<string, boolean> | undefined>)[mod];
    out[mod] = { ...(ops as Record<string, boolean>) };
    if (storedMod) {
      for (const op of Object.keys(out[mod])) {
        if (typeof storedMod[op] === 'boolean') out[mod][op] = storedMod[op];
      }
    }
  }
  return out as unknown as SuperAdminPermissions;
}

/**
 * Resolve a superadmin user's effective permissions.
 * - `super_admin` is the root role and always has full permissions.
 * - Other superadmin roles use their stored permissions deep-merged over the
 *   role defaults (missing keys fall back to defaults).
 * - Non-superadmin roles get nothing.
 */
export function resolveSuperAdminPermissions(
  user: Pick<AuthUser, 'role' | 'saPermissions'>,
): SuperAdminPermissions {
  if (!SUPERADMIN_ROLES.has(user.role)) return NO_PERMISSIONS;
  if (user.role === 'super_admin') return DEFAULT_SUPER_ADMIN_PERMISSIONS;
  return mergeOverDefaults(getRoleDefaults(user.role), user.saPermissions);
}

/**
 * Check a superadmin platform permission.
 * Returns false for non-superadmin roles.
 */
export function hasSuperAdminPermission(
  user: AuthUser,
  module: keyof SuperAdminPermissions,
  operation: string,
): boolean {
  if (!SUPERADMIN_ROLES.has(user.role)) return false;

  const perms = resolveSuperAdminPermissions(user);
  const mod = perms[module] as unknown as Record<string, boolean> | undefined;
  return mod?.[operation] === true;
}
