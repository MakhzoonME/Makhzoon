import { adminDb } from '@/lib/firebase/admin';
import { OrgSSOConfig } from '@/types/sso.types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';

const COLLECTION = 'organizationSSOConfigs';

function toSSOConfig(id: string, data: FirebaseFirestore.DocumentData): OrgSSOConfig {
  return {
    organizationId: id,
    enabled: data.enabled ?? false,
    enforced: data.enforced ?? false,
    type: data.type ?? 'oidc',
    clientId: data.clientId ?? '',
    clientSecret: data.clientSecret ?? '',
    issuerUrl: data.issuerUrl ?? '',
    allowedDomains: data.allowedDomains ?? [],
    domainVerified: data.domainVerified ?? false,
    domainVerificationToken: data.domainVerificationToken ?? '',
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    updatedBy: data.updatedBy ?? '',
  };
}

export async function getOrgSSOConfig(orgId: string): Promise<OrgSSOConfig | null> {
  const doc = await adminDb.collection(COLLECTION).doc(orgId).get();
  if (!doc.exists) return null;
  return toSSOConfig(doc.id, doc.data()!);
}

export async function getOrgSSOConfigByDomain(domain: string): Promise<OrgSSOConfig | null> {
  const snap = await adminDb
    .collection(COLLECTION)
    .where('allowedDomains', 'array-contains', domain)
    .where('enabled', '==', true)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return toSSOConfig(snap.docs[0].id, snap.docs[0].data());
}

export async function saveOrgSSOConfig(
  orgId: string,
  data: Omit<OrgSSOConfig, 'organizationId' | 'createdAt' | 'updatedAt' | 'domainVerificationToken'>,
  updatedBy: string,
): Promise<void> {
  const docRef = adminDb.collection(COLLECTION).doc(orgId);
  const existing = await docRef.get();

  if (!existing.exists) {
    await docRef.set({
      ...data,
      organizationId: orgId,
      domainVerificationToken: randomBytes(20).toString('hex'),
      updatedBy,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    await docRef.update({
      ...data,
      organizationId: orgId,
      updatedBy,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

export async function markDomainVerified(orgId: string): Promise<void> {
  await adminDb.collection(COLLECTION).doc(orgId).update({
    domainVerified: true,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function generateDomainVerificationToken(orgId: string): Promise<string> {
  const token = randomBytes(20).toString('hex');
  await adminDb.collection(COLLECTION).doc(orgId).update({
    domainVerificationToken: token,
    domainVerified: false,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return token;
}

export async function storePendingSSO(
  nonce: string,
  customToken: string,
  orgSlug: string,
): Promise<void> {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  await adminDb.collection('pendingSSOSessions').doc(nonce).set({
    nonce,
    customToken,
    orgSlug,
    expiresAt: Timestamp.fromDate(expiresAt),
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function consumePendingSSO(
  nonce: string,
): Promise<{ customToken: string; orgSlug: string } | null> {
  const docRef = adminDb.collection('pendingSSOSessions').doc(nonce);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  const expiresAt = data.expiresAt instanceof Timestamp ? data.expiresAt.toDate() : new Date(0);
  if (expiresAt < new Date()) {
    await docRef.delete();
    return null;
  }

  await docRef.delete();
  return { customToken: data.customToken, orgSlug: data.orgSlug };
}
