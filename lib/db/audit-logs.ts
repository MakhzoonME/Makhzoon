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
  cursor?: string;
}): Promise<{ logs: AuditLog[]; nextCursor: string | null }> {
  const pageSize = opts?.limit ?? 50;
  let q = adminDb
    .collection('auditLogs')
    .orderBy('timestamp', 'desc')
    .limit(pageSize + 1) as FirebaseFirestore.Query;

  if (opts?.orgId) q = q.where('organizationId', '==', opts.orgId);
  if (opts?.userId) q = q.where('userId', '==', opts.userId);
  if (opts?.action) q = q.where('action', '==', opts.action);
  if (opts?.dateFrom) q = q.where('timestamp', '>=', new Date(opts.dateFrom));
  if (opts?.dateTo) q = q.where('timestamp', '<=', new Date(opts.dateTo));

  if (opts?.cursor) {
    const cursorDoc = await adminDb.collection('auditLogs').doc(opts.cursor).get();
    if (cursorDoc.exists) q = q.startAfter(cursorDoc);
  }

  const snap = await q.get();
  const docs = snap.docs;
  const hasMore = docs.length > pageSize;
  const page = hasMore ? docs.slice(0, pageSize) : docs;

  return {
    logs: page.map((d) => toLog(d.id, d.data())),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}
