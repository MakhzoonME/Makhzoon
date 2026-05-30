import { UserPermissions } from './user-permissions.types';

export type UserRole = 'super_admin' | 'makhzoon_admin' | 'makhzoon_support' | 'org_owner' | 'admin' | 'staff';

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  role: UserRole;
  organizationId: string | null;
  orgSlug?: string | null;
  permissions?: UserPermissions | null;
  features?: Record<string, boolean>;
  /** Spaces feature — populated once PR-3 wires up resolveTenant. Until then undefined. */
  allSpaces?: boolean;
  accessibleSpaceIds?: string[];
}
