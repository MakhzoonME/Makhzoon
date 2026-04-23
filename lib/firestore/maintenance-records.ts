import { adminDb } from '@/lib/firebase/admin';
import { MaintenanceRecord } from '@/types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

function toRecord(id: string, data: FirebaseFirestore.DocumentData): MaintenanceRecord {
  return {
    id,
    organizationId: data.organizationId,
    assetId: data.assetId,
    type: data.type,
    description: data.description,
    performedBy: data.performedBy,
    cost: data.cost,
    date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
    createdBy: data.createdBy,
    createdByEmail: data.createdByEmail,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
  };
}

export async function getMaintenanceRecords(orgId: string, assetId?: string): Promise<MaintenanceRecord[]> {
  let q = adminDb.collection('maintenanceRecords')
    .where('organizationId', '==', orgId)
    .orderBy('date', 'desc') as FirebaseFirestore.Query;
  if (assetId) q = q.where('assetId', '==', assetId);
  const snap = await q.get();
  return snap.docs.map((d) => toRecord(d.id, d.data()));
}

export async function getMaintenanceRecordById(id: string): Promise<MaintenanceRecord | null> {
  const doc = await adminDb.collection('maintenanceRecords').doc(id).get();
  if (!doc.exists) return null;
  return toRecord(doc.id, doc.data()!);
}

export async function createMaintenanceRecord(data: Omit<MaintenanceRecord, 'id' | 'createdAt'>): Promise<string> {
  const ref = await adminDb.collection('maintenanceRecords').add({
    ...data,
    date: new Date(data.date),
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function deleteMaintenanceRecord(id: string): Promise<void> {
  await adminDb.collection('maintenanceRecords').doc(id).delete();
}
