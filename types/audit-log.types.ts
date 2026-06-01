import { UserRole } from './auth.types';

export interface AuditLog {
  id: string;
  organizationId: string;
  userId: string;
  role: UserRole;
  action: string;
  module: string;
  recordId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  timestamp: Date;
  transferMode?: boolean;
  spaceId?: string;
  // enriched fields
  userDisplayName?: string;
  recordName?: string;
  orgName?: string;
  spaceName?: string;
}
