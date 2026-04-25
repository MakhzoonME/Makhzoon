import { adminDb } from '@/lib/firebase/admin';
import type { PaymentLog, PaymentLogMethod } from '@/types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

function toPaymentLog(id: string, data: FirebaseFirestore.DocumentData): PaymentLog {
  return {
    id,
    organizationId: data.organizationId,
    subscriptionId: data.subscriptionId,
    amount: data.amount,
    currency: data.currency,
    method: data.method as PaymentLogMethod,
    reference: data.reference ?? null,
    paidAt: data.paidAt instanceof Timestamp ? data.paidAt.toDate() : new Date(data.paidAt),
    notes: data.notes ?? null,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    createdBy: data.createdBy ?? '',
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    updatedBy: data.updatedBy ?? '',
  };
}

export async function getPaymentLogs(orgId: string, opts?: { limit?: number }): Promise<PaymentLog[]> {
  let q: FirebaseFirestore.Query = adminDb
    .collection('paymentLogs')
    .where('organizationId', '==', orgId)
    .orderBy('paidAt', 'desc');
  if (opts?.limit) q = q.limit(opts.limit);
  const snap = await q.get();
  return snap.docs.map((d) => toPaymentLog(d.id, d.data()));
}

export async function getPaymentLogById(logId: string): Promise<PaymentLog | null> {
  const doc = await adminDb.collection('paymentLogs').doc(logId).get();
  if (!doc.exists) return null;
  return toPaymentLog(doc.id, doc.data()!);
}

export async function createPaymentLog(
  userId: string,
  payload: {
    organizationId: string;
    subscriptionId: string;
    amount: number;
    currency: string;
    method: PaymentLogMethod;
    reference?: string | null;
    paidAt: Date;
    notes?: string | null;
  },
): Promise<PaymentLog> {
  const ref = adminDb.collection('paymentLogs').doc();
  await ref.set({
    organizationId: payload.organizationId,
    subscriptionId: payload.subscriptionId,
    amount: payload.amount,
    currency: payload.currency.toUpperCase(),
    method: payload.method,
    reference: payload.reference ?? null,
    paidAt: payload.paidAt,
    notes: payload.notes ?? null,
    createdBy: userId,
    updatedBy: userId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const doc = await ref.get();
  return toPaymentLog(doc.id, doc.data()!);
}

export async function deletePaymentLog(logId: string): Promise<void> {
  await adminDb.collection('paymentLogs').doc(logId).delete();
}
