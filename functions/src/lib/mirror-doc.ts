import { FieldValue } from 'firebase-admin/firestore';
import { devDb } from './dev-admin';

// Upsert semantics: prod create/update → dev set(..., merge:true) with mirror metadata.
// Soft-delete: prod delete → dev set { deletedAt, mirrorState: 'deleted' } (merge), never .delete().
//
// Idempotent. Safe to retry on Cloud Functions failure.

export async function mirrorUpsert(
  collection: string,
  id: string,
  data: FirebaseFirestore.DocumentData,
) {
  const ref = devDb().collection(collection).doc(id);
  await ref.set(
    {
      ...data,
      _mirrorSource: 'prod',
      _mirrorAt: FieldValue.serverTimestamp(),
      _mirrorState: 'live',
      _mirrorDeletedAt: FieldValue.delete(),
    },
    { merge: true },
  );
}

export async function mirrorSoftDelete(collection: string, id: string) {
  const ref = devDb().collection(collection).doc(id);
  await ref.set(
    {
      _mirrorSource: 'prod',
      _mirrorAt: FieldValue.serverTimestamp(),
      _mirrorState: 'deleted',
      _mirrorDeletedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}
