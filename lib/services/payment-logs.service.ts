import { AuthUser } from '@/types/auth.types';
import {
  getPaymentLogs,
  createPaymentLog as dbCreatePaymentLog,
  deletePaymentLog as dbDeletePaymentLog,
} from '@/lib/db/payment-logs';
import { queueAuditLog } from '@/lib/audit/logger';
import { getUserContext } from './base.service';

export interface CreatePaymentLogInput {
  amount: number;
  currency: string;
  method: 'CARD' | 'BANK_TRANSFER' | 'MANUAL' | 'OTHER';
  notes?: string;
}

export async function getOrgPaymentLogs(user: AuthUser) {
  if (!user.organizationId) throw new Error('User has no organization');
  return getPaymentLogs(user.organizationId);
}

export async function createPaymentLogWithAudit(
  user: AuthUser,
  data: CreatePaymentLogInput
) {
  if (!user.organizationId) throw new Error('User has no organization');
  const userContext = getUserContext(user);
  const result = await dbCreatePaymentLog(userContext.uid, {
    organizationId: user.organizationId,
    subscriptionId: '',
    amount: data.amount,
    currency: data.currency,
    method: data.method,
    notes: data.notes,
    paidAt: new Date(),
  });

  queueAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'PAYMENT_LOG_CREATED',
    module: 'payment-logs',
    recordId: result.id,
    newValue: data,
  });

  return { id: result.id };
}

export async function deletePaymentLogWithAudit(user: AuthUser, logId: string) {
  if (!user.organizationId) throw new Error('User has no organization');
  const userContext = getUserContext(user);
  const log = await getPaymentLogs(user.organizationId);
  const target = log.find((l) => l.id === logId);
  if (!target) throw new Error('Payment log not found');

  await dbDeletePaymentLog(logId);

  queueAuditLog({
    organizationId: user.organizationId,
    userId: userContext.uid,
    role: userContext.role,
    action: 'PAYMENT_LOG_DELETED',
    module: 'payment-logs',
    recordId: logId,
    oldValue: target,
  });
}
