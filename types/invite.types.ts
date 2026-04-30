import { UserPermissions } from './user-permissions.types';

export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';
export type InviteRole = 'org_owner' | 'admin' | 'staff';

export interface Invite {
  id: string;
  organizationId: string;
  email?: string;
  username?: string;
  displayName: string;
  role: InviteRole;
  token: string;
  status: InviteStatus;
  invitedBy: string;
  invitedByEmail: string;
  invitedByName?: string;
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedBy?: string;
  revokedAt?: Date;
  revokedBy?: string;
  createdAt: Date;
  permissions?: UserPermissions | null;
}
