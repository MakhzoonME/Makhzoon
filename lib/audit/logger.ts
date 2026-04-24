import { adminDb } from '@/lib/firebase/admin';
import { UserRole } from '@/types';
import { FieldValue } from 'firebase-admin/firestore';

export type AuditAction =
  | 'ASSET_CREATED' | 'ASSET_UPDATED' | 'ASSET_RETIRED' | 'ASSET_DELETED' | 'ASSETS_IMPORTED'
  | 'ASSET_NOTE_ADDED' | 'ASSET_NOTE_DELETED'
  | 'MAINTENANCE_ADDED' | 'MAINTENANCE_UPDATED' | 'MAINTENANCE_DELETED'
  | 'ASSET_CHECKED_OUT' | 'ASSET_CHECKED_IN'
  | 'WARRANTY_CREATED' | 'WARRANTY_UPDATED' | 'WARRANTY_DELETED'
  | 'WARRANTY_ALERT_SENT'
  | 'REQUEST_SUBMITTED' | 'REQUEST_APPROVED' | 'REQUEST_REJECTED'
  | 'USER_INVITED' | 'USER_UPDATED' | 'USER_DEACTIVATED'
  | 'INVITE_SENT' | 'INVITE_ACCEPTED' | 'INVITE_REVOKED'
  | 'ORGANIZATION_CREATED' | 'ORGANIZATION_UPDATED' | 'ORGANIZATION_SELF_SERVE_CREATED'
  | 'SUBSCRIPTION_UPDATED'
  | 'TRANSFER_MODE_ENTERED' | 'TRANSFER_MODE_EXITED';

interface LogParams {
  organizationId: string;
  userId: string;
  role: UserRole;
  action: AuditAction;
  module: string;
  recordId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  transferMode?: boolean;
}

export async function writeAuditLog(params: LogParams): Promise<void> {
  await adminDb.collection('auditLogs').add({
    ...params,
    timestamp: FieldValue.serverTimestamp(),
  });
}
