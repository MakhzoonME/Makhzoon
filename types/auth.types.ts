export type UserRole = 'super_admin' | 'org_owner' | 'admin' | 'staff';

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  organizationId: string | null;
}
