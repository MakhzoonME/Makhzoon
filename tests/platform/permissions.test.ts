import { describe, it, expect } from 'vitest';
import { hasPermission, hasModuleAccess, hasPermByKey } from '@/lib/permissions';
import { hasSuperAdminPermission } from '@/lib/permissions/superadmin';
import type { AuthUser, UserRole } from '@/types/auth.types';
import type { UserPermissions } from '@/types/user-permissions.types';
import type { SuperAdminPermissions } from '@/types/superadmin-permissions.types';

function user(
  role: UserRole,
  permissions: Partial<UserPermissions> | null = null,
  saPermissions: SuperAdminPermissions | null = null,
): AuthUser {
  return {
    uid: 'u',
    email: 'u@x.test',
    displayName: 'U',
    role,
    organizationId: 'org-1',
    permissions: permissions as UserPermissions | null,
    saPermissions,
  };
}

describe('hasPermission — role defaults (no stored permissions)', () => {
  it('org_owner and admin get full access to any operation', () => {
    for (const role of ['org_owner', 'admin', 'super_admin'] as UserRole[]) {
      expect(hasPermission(user(role), 'assets', 'create')).toBe(true);
      expect(hasPermission(user(role), 'assets', 'delete')).toBe(true);
    }
  });

  it('staff get view-only by default', () => {
    expect(hasPermission(user('staff'), 'assets', 'view')).toBe(true);
    expect(hasPermission(user('staff'), 'assets', 'create')).toBe(false);
    expect(hasPermission(user('staff'), 'assets', 'delete')).toBe(false);
  });
});

describe('hasPermission — stored permissions override role defaults', () => {
  it('restricts an admin who has an explicit false', () => {
    const u = user('admin', { assets: { view: true, create: false } } as Partial<UserPermissions>);
    expect(hasPermission(u, 'assets', 'view')).toBe(true);
    expect(hasPermission(u, 'assets', 'create')).toBe(false);
  });

  it('grants a staff member an explicitly enabled operation', () => {
    const u = user('staff', { assets: { view: true, create: true } } as Partial<UserPermissions>);
    expect(hasPermission(u, 'assets', 'create')).toBe(true);
  });

  it('falls back to role default when the whole module block is absent', () => {
    // admin with stored perms for inventory only — assets block missing entirely
    const u = user('admin', { inventory: { view: true } } as Partial<UserPermissions>);
    expect(hasPermission(u, 'assets', 'create')).toBe(true); // admin default
    const s = user('staff', { inventory: { view: true } } as Partial<UserPermissions>);
    expect(hasPermission(s, 'assets', 'create')).toBe(false); // staff default (non-view)
    expect(hasPermission(s, 'assets', 'view')).toBe(false); // module block absent → role default, staff has no admin role
  });

  it('falls back to role default when a specific operation key is missing (new field)', () => {
    // admin stored perms predate a new "archive" operation — must not lose access
    const u = user('admin', { assets: { view: true, create: true } } as Partial<UserPermissions>);
    expect(hasPermission(u, 'assets', 'archive')).toBe(true);
    // staff in the same situation stays denied for the new non-view op
    const s = user('staff', { assets: { view: true } } as Partial<UserPermissions>);
    expect(hasPermission(s, 'assets', 'archive')).toBe(false);
  });
});

describe('hasModuleAccess / hasPermByKey', () => {
  it('hasModuleAccess is view permission', () => {
    expect(hasModuleAccess(user('staff'), 'reports')).toBe(true);
    const restricted = user('staff', { reports: { view: false } } as Partial<UserPermissions>);
    expect(hasModuleAccess(restricted, 'reports')).toBe(false);
  });

  it('hasPermByKey resolves dotted keys', () => {
    expect(hasPermByKey(user('admin'), 'assets.create')).toBe(true);
    expect(hasPermByKey(user('staff'), 'assets.create')).toBe(false);
    expect(hasPermByKey(user('admin'), 'malformed')).toBe(false);
  });
});

describe('hasSuperAdminPermission', () => {
  it('returns false for non-superadmin roles regardless of module', () => {
    expect(hasSuperAdminPermission(user('admin'), 'organizations', 'view')).toBe(false);
    expect(hasSuperAdminPermission(user('org_owner'), 'team', 'manage')).toBe(false);
  });

  it('super_admin gets full platform access via role defaults', () => {
    expect(hasSuperAdminPermission(user('super_admin'), 'organizations', 'delete')).toBe(true);
    expect(hasSuperAdminPermission(user('super_admin'), 'team', 'manage')).toBe(true);
  });

  it('makhzoon_support cannot manage team or delete orgs by default', () => {
    expect(hasSuperAdminPermission(user('makhzoon_support'), 'team', 'manage')).toBe(false);
    expect(hasSuperAdminPermission(user('makhzoon_support'), 'organizations', 'delete')).toBe(false);
    expect(hasSuperAdminPermission(user('makhzoon_support'), 'support', 'respond')).toBe(true);
  });

  it('stored saPermissions override role defaults', () => {
    const sa = {
      organizations: { view: true, create: false, update: false, delete: false },
      support: { view: false, respond: false, close: false },
      configuration: { view: false, edit: false },
      auditLogs: { view: false },
      team: { view: false, manage: false },
      backendLogs: { view: false },
    } as SuperAdminPermissions;
    const u = user('makhzoon_admin', null, sa);
    expect(hasSuperAdminPermission(u, 'organizations', 'view')).toBe(true);
    expect(hasSuperAdminPermission(u, 'organizations', 'delete')).toBe(false);
    expect(hasSuperAdminPermission(u, 'team', 'manage')).toBe(false);
  });
});
