import { adminDb } from '@/lib/firebase/admin';
import { AuditLog } from '@/types';
import { Timestamp } from 'firebase-admin/firestore';

function toLog(id: string, data: FirebaseFirestore.DocumentData): AuditLog {
  return {
    id,
    organizationId: data.organizationId,
    userId: data.userId,
    role: data.role,
    action: data.action,
    module: data.module,
    recordId: data.recordId,
    oldValue: data.oldValue,
    newValue: data.newValue,
    timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(),
    transferMode: data.transferMode,
  };
}

export async function getAuditLogs(opts?: {
  orgId?: string;
  userId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}): Promise<AuditLog[]> {
  let q = adminDb.collection('auditLogs').orderBy('timestamp', 'desc').limit(opts?.limit ?? 50) as FirebaseFirestore.Query;

  if (opts?.orgId) q = q.where('organizationId', '==', opts.orgId);
  if (opts?.userId) q = q.where('userId', '==', opts.userId);
  if (opts?.action) q = q.where('action', '==', opts.action);
  if (opts?.dateFrom) q = q.where('timestamp', '>=', new Date(opts.dateFrom));
  if (opts?.dateTo) q = q.where('timestamp', '<=', new Date(opts.dateTo));

  const snap = await q.get();
  return snap.docs.map((d) => toLog(d.id, d.data()));
}
