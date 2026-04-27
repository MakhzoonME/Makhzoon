export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';
export type InviteRole = 'admin' | 'staff';
export type InviteChannel = 'email' | 'sms' | 'whatsapp';

export interface Invite {
  id: string;
  organizationId: string;
  email?: string;
  phone?: string;
  channel: InviteChannel;
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
}
