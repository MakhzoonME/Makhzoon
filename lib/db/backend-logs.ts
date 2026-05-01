import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { BackendLogEntry, LogLevel } from '@/lib/logging/backend-logger';

export interface BackendLog extends BackendLogEntry {
  id: string;
}

function toLog(id: string, data: FirebaseFirestore.DocumentData): BackendLog {
  return {
    id,
    timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(),
    method: data.method ?? '',
    path: data.path ?? '',
    statusCode: data.statusCode ?? 0,
    level: (data.level ?? 'info') as LogLevel,
    durationMs: data.durationMs ?? 0,
    userId: data.userId,
    userDisplayName: data.userDisplayName,
    organizationId: data.organizationId,
    organizationName: data.organizationName,
    role: data.role,
    errorMessage: data.errorMessage,
    requestSummary: data.requestSummary,
    responseSummary: data.responseSummary,
  };
}

export interface GetBackendLogsOptions {
  limit?: number;
  level?: LogLevel | 'all';
  method?: string;
  path?: string;
  organizationId?: string;
  userId?: string;
}

export async function getBackendLogs(opts: GetBackendLogsOptions = {}): Promise<BackendLog[]> {
  let query = adminDb.collection('backendLogs').orderBy('timestamp', 'desc') as FirebaseFirestore.Query;

  if (opts.level && opts.level !== 'all') {
    query = query.where('level', '==', opts.level);
  }
  if (opts.organizationId) {
    query = query.where('organizationId', '==', opts.organizationId);
  }
  if (opts.userId) {
    query = query.where('userId', '==', opts.userId);
  }

  query = query.limit(opts.limit ?? 200);

  const snap = await query.get();
  return snap.docs.map((d) => toLog(d.id, d.data()));
}
