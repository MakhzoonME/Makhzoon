import { adminDb } from '@/lib/firebase/admin';
import type { Package, PackageLimits, FeatureKey } from '@/types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

function toPackage(id: string, data: FirebaseFirestore.DocumentData): Package {
  return {
    id,
    name: data.name,
    description: data.description ?? '',
    isActive: data.isActive ?? true,
    limits: {
      maxAssets: data.limits?.maxAssets ?? -1,
      maxUsers: data.limits?.maxUsers ?? -1,
      maxWarranties: data.limits?.maxWarranties ?? -1,
      maxRequests: data.limits?.maxRequests ?? -1,
    },
    features: (data.features ?? {}) as Record<FeatureKey, boolean>,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    createdBy: data.createdBy ?? '',
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    updatedBy: data.updatedBy ?? '',
  };
}

export async function getPackages(opts?: { includeInactive?: boolean }): Promise<Package[]> {
  const snap = await adminDb.collection('packages').orderBy('name', 'asc').get();
  const all = snap.docs.map((d) => toPackage(d.id, d.data()));
  return opts?.includeInactive ? all : all.filter((p) => p.isActive);
}

export async function getPackageById(packageId: string): Promise<Package | null> {
  const doc = await adminDb.collection('packages').doc(packageId).get();
  if (!doc.exists) return null;
  return toPackage(doc.id, doc.data()!);
}

export async function getPackagesByIds(ids: string[]): Promise<Package[]> {
  if (ids.length === 0) return [];
  const unique = Array.from(new Set(ids));
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 10) chunks.push(unique.slice(i, i + 10));
  const results: Package[] = [];
  for (const chunk of chunks) {
    const snap = await adminDb
      .collection('packages')
      .where('__name__', 'in', chunk)
      .get();
    results.push(...snap.docs.map((d) => toPackage(d.id, d.data())));
  }
  return results;
}

export async function createPackage(
  userId: string,
  payload: {
    name: string;
    description: string;
    isActive: boolean;
    limits: PackageLimits;
    features: Record<FeatureKey, boolean>;
  },
): Promise<Package> {
  const ref = adminDb.collection('packages').doc();
  await ref.set({
    ...payload,
    createdBy: userId,
    updatedBy: userId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const doc = await ref.get();
  return toPackage(doc.id, doc.data()!);
}

export async function updatePackage(
  packageId: string,
  userId: string,
  updates: Partial<Pick<Package, 'name' | 'description' | 'isActive' | 'limits' | 'features'>>,
): Promise<void> {
  await adminDb.collection('packages').doc(packageId).update({
    ...updates,
    updatedBy: userId,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deletePackage(packageId: string, userId: string): Promise<void> {
  // Soft delete: keep historical references intact
  await adminDb.collection('packages').doc(packageId).update({
    isActive: false,
    updatedBy: userId,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
