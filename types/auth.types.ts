import { UserPermissions } from './user-permissions.types';
import { SuperAdminPermissions } from './superadmin-permissions.types';
import type { AddOnKey, HarakaModule } from './subscription.types';

export type UserRole = 'super_admin' | 'makhzoon_admin' | 'makhzoon_support' | 'org_owner' | 'admin' | 'staff';

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  role: UserRole;
  organizationId: string | null;
  orgSlug?: string | null;
  /** Org-scoped per-user permissions (staff + custom admin restrictions). null = use role defaults. */
  permissions?: UserPermissions | null;
  /** Platform-scoped permissions for superadmin team members. null = use role defaults. */
  saPermissions?: SuperAdminPermissions | null;
  features?: Record<string, boolean>;
  /** Haraka sub-modules active on the org's subscription (plan-included + purchased add-ons). */
  activeHarakaModules?: HarakaModule[];
  /** Independent add-ons active on the org's subscription (plan-included + purchased). */
  activeAddOns?: Record<AddOnKey, boolean>;
  /** Spaces feature — populated once PR-3 wires up resolveTenant. Until then undefined. */
  allSpaces?: boolean;
  accessibleSpaceIds?: string[];
}
