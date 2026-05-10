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

const SUPERADMIN_ROLES = new Set(['super_admin', 'makhzoon_admin', 'makhzoon_support']);

export async function getAuditLogs(opts?: {
  orgId?: string;
  userId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  excludeSuperadminActions?: boolean;
}): Promise<{ logs: AuditLog[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 20;

  let q = adminDb
    .collection('auditLogs')
    .orderBy('timestamp', 'desc') as FirebaseFirestore.Query;

  if (opts?.orgId) q = q.where('organizationId', '==', opts.orgId);
  if (opts?.userId) q = q.where('userId', '==', opts.userId);
  if (opts?.action) q = q.where('action', '==', opts.action);
  if (opts?.dateFrom) q = q.where('timestamp', '>=', new Date(opts.dateFrom));
  if (opts?.dateTo) q = q.where('timestamp', '<=', new Date(opts.dateTo));

  const snap = await q.get();
  let logs = snap.docs.map((d) => toLog(d.id, d.data()));

  // Org users must not see actions performed by superadmin roles (including transfer mode actions)
  if (opts?.excludeSuperadminActions) {
    logs = logs.filter((l) => !SUPERADMIN_ROLES.has(l.role) && !l.transferMode);
  }

  const total = logs.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const paged = logs.slice(start, start + pageSize);

  return { logs: paged, total, page: safePage, pageSize, totalPages };
}
