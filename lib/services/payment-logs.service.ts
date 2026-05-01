import { AuthUser } from '@/types/auth.types';
import {
  getPaymentLogs,
  createPaymentLog as dbCreatePaymentLog,
  deletePaymentLog as dbDeletePaymentLog,
} from '@/lib/db/payment-logs';
import { writeAuditLog } from '@/lib/audit/logger';
import { getUserContext } from './base.service';

export interface CreatePaymentLogInput {
  amount: number;
  currency: string;
  method: 'CARD' | 'BANK_TRANSFER' | 'MANUAL' | 'OTHER';
  notes?: string;
}

export async function getOrgPaymentLogs(user: AuthUser) {
  return getPaymentLogs(user.organizationId);
}

export async function createPaymentLogWithAudit(
  user: AuthUser,
  data: CreatePaymentLogInput
) {
  const userContext = getUserContext(user);
  const id = await dbCreatePaymentLog({
    organizationId: user.organizationId,
    ...data,
    createdBy: userContext.uid,
  });

  await writeAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'PAYMENT_LOG_CREATED',
    module: 'payment-logs',
    recordId: id,
    newValue: data,
  });

  return { id };
}

export async function deletePaymentLogWithAudit(user: AuthUser, logId: string) {
  const userContext = getUserContext(user);
  const log = await getPaymentLogs(user.organizationId);
  const target = log.find((l) => l.id === logId);
  if (!target) throw new Error('Payment log not found');

  await dbDeletePaymentLog(logId);

  await writeAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'PAYMENT_LOG_DELETED',
    module: 'payment-logs',
    recordId: logId,
    oldValue: target,
  });
}
