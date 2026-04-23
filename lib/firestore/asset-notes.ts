import { adminDb } from '@/lib/firebase/admin';
import { AssetNote } from '@/types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

function toNote(id: string, data: FirebaseFirestore.DocumentData): AssetNote {
  return {
    id,
    organizationId: data.organizationId,
    assetId: data.assetId,
    text: data.text,
    createdBy: data.createdBy,
    createdByEmail: data.createdByEmail,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
  };
}

export async function getAssetNotes(orgId: string, assetId: string): Promise<AssetNote[]> {
  const snap = await adminDb.collection('assetNotes')
    .where('organizationId', '==', orgId)
    .where('assetId', '==', assetId)
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map((d) => toNote(d.id, d.data()));
}

export async function createAssetNote(data: Omit<AssetNote, 'id' | 'createdAt'>): Promise<string> {
  const ref = await adminDb.collection('assetNotes').add({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function getAssetNoteById(id: string): Promise<AssetNote | null> {
  const doc = await adminDb.collection('assetNotes').doc(id).get();
  if (!doc.exists) return null;
  return toNote(doc.id, doc.data()!);
}

export async function deleteAssetNote(id: string): Promise<void> {
  await adminDb.collection('assetNotes').doc(id).delete();
}
