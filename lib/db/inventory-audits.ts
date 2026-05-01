import { adminDb } from '@/lib/firebase/admin';
import { InventoryAudit, InventoryAuditItem } from '@/types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

function toAudit(id: string, d: FirebaseFirestore.DocumentData): InventoryAudit {
  return {
    id,
    organizationId: d.organizationId,
    title: d.title,
    status: d.status,
    notes: d.notes,
    totalAssets: d.totalAssets ?? 0,
    foundCount: d.foundCount ?? 0,
    missingCount: d.missingCount ?? 0,
    pendingCount: d.pendingCount ?? 0,
    startedBy: d.startedBy,
    startedByName: d.startedByName,
    completedAt: d.completedAt instanceof Timestamp ? d.completedAt.toDate() : undefined,
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate() : new Date(),
    updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : new Date(),
  };
}

function toAuditItem(id: string, d: FirebaseFirestore.DocumentData): InventoryAuditItem {
  return {
    id,
    auditId: d.auditId,
    organizationId: d.organizationId,
    assetId: d.assetId,
    assetName: d.assetName,
    assetCategory: d.assetCategory,
    assetSerial: d.assetSerial,
    assetLocation: d.assetLocation,
    assetAssignedTo: d.assetAssignedTo,
    status: d.status,
    note: d.note,
    checkedAt: d.checkedAt instanceof Timestamp ? d.checkedAt.toDate() : undefined,
    checkedBy: d.checkedBy,
    checkedByName: d.checkedByName,
  };
}

export async function getInventoryAudits(orgId: string): Promise<InventoryAudit[]> {
  const snap = await adminDb.collection('inventoryAudits')
    .where('organizationId', '==', orgId)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  return snap.docs.map((d) => toAudit(d.id, d.data()));
}

export async function getInventoryAuditById(id: string): Promise<InventoryAudit | null> {
  const doc = await adminDb.collection('inventoryAudits').doc(id).get();
  if (!doc.exists) return null;
  return toAudit(doc.id, doc.data()!);
}

export async function createInventoryAudit(data: {
  organizationId: string;
  title: string;
  notes?: string;
  startedBy: string;
  startedByName?: string;
  assets: Array<{ id: string; name: string; category: string; serialNumber?: string; location?: string; assignedTo?: string }>;
}): Promise<string> {
  const total = data.assets.length;
  const auditRef = adminDb.collection('inventoryAudits').doc();

  await adminDb.runTransaction(async (t) => {
    t.set(auditRef, {
      organizationId: data.organizationId,
      title: data.title,
      notes: data.notes ?? null,
      status: 'in_progress',
      totalAssets: total,
      foundCount: 0,
      missingCount: 0,
      pendingCount: total,
      startedBy: data.startedBy,
      startedByName: data.startedByName ?? null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    for (const asset of data.assets) {
      const itemRef = adminDb.collection('inventoryAuditItems').doc();
      t.set(itemRef, {
        auditId: auditRef.id,
        organizationId: data.organizationId,
        assetId: asset.id,
        assetName: asset.name,
        assetCategory: asset.category,
        assetSerial: asset.serialNumber ?? null,
        assetLocation: asset.location ?? null,
        assetAssignedTo: asset.assignedTo ?? null,
        status: 'pending',
        note: null,
        checkedAt: null,
        checkedBy: null,
        checkedByName: null,
      });
    }
  });

  return auditRef.id;
}

export async function getAuditItems(auditId: string): Promise<InventoryAuditItem[]> {
  const snap = await adminDb.collection('inventoryAuditItems')
    .where('auditId', '==', auditId)
    .orderBy('assetName', 'asc')
    .get();
  return snap.docs.map((d) => toAuditItem(d.id, d.data()));
}

export async function updateAuditItem(
  auditItemId: string,
  auditId: string,
  status: 'found' | 'missing',
  actor: { uid: string; displayName?: string },
  note?: string
): Promise<void> {
  await adminDb.runTransaction(async (t) => {
    const itemRef = adminDb.collection('inventoryAuditItems').doc(auditItemId);
    const auditRef = adminDb.collection('inventoryAudits').doc(auditId);

    const [itemSnap, auditSnap] = await Promise.all([t.get(itemRef), t.get(auditRef)]);
    if (!itemSnap.exists || !auditSnap.exists) throw new Error('Not found');

    const prevStatus = itemSnap.data()!.status as string;
    const audit = auditSnap.data()!;

    const delta = { foundCount: 0, missingCount: 0, pendingCount: 0 };
    if (prevStatus === 'pending') delta.pendingCount = -1;
    else if (prevStatus === 'found') delta.foundCount = -1;
    else if (prevStatus === 'missing') delta.missingCount = -1;

    if (status === 'found') delta.foundCount += 1;
    else delta.missingCount += 1;

    t.update(itemRef, {
      status,
      note: note ?? null,
      checkedAt: FieldValue.serverTimestamp(),
      checkedBy: actor.uid,
      checkedByName: actor.displayName ?? null,
    });

    const newFound = (audit.foundCount ?? 0) + delta.foundCount;
    const newMissing = (audit.missingCount ?? 0) + delta.missingCount;
    const newPending = (audit.pendingCount ?? 0) + delta.pendingCount;
    const allChecked = newPending === 0;

    t.update(auditRef, {
      foundCount: newFound,
      missingCount: newMissing,
      pendingCount: newPending,
      ...(allChecked ? { status: 'completed', completedAt: FieldValue.serverTimestamp() } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function completeAudit(auditId: string): Promise<void> {
  await adminDb.collection('inventoryAudits').doc(auditId).update({
    status: 'completed',
    completedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
