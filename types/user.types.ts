import { UserPermissions } from './user-permissions.types';

export interface OrgUser {
  id: string;
  organizationId: string;
  email?: string;
  username?: string;
  displayName: string;
  avatarUrl?: string | null;
  role: 'org_owner' | 'admin' | 'staff';
  status: 'active' | 'deactivated';
  permissions?: UserPermissions | null;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}
