import { adminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { randomBytes, createHash } from 'crypto';

export const PASSWORD_RESET_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Hash a token using SHA256. The plaintext token is sent to the user via email;
 * only the hash is stored in Firestore for security.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a password reset token and store its hash with 24-hour expiry.
 * Returns the plaintext token to be sent via email.
 */
export async function createPasswordResetToken(
  uid: string
): Promise<string> {
  // Generate 32-byte random token (base64: 43 chars)
  const plainToken = randomBytes(32).toString('base64url');
  const hashedToken = hashToken(plainToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_MS);

  await adminDb.collection('passwordResetTokens').doc(hashedToken).set({
    uid,
    hashedToken,
    expiresAt: Timestamp.fromDate(expiresAt),
    createdAt: FieldValue.serverTimestamp(),
  });

  return plainToken;
}

/**
 * Verify a password reset token and return the UID if valid.
 * Deletes the token after use (one-time use).
 */
export async function verifyPasswordResetToken(plainToken: string): Promise<string | null> {
  const hashedToken = hashToken(plainToken);
  const doc = await adminDb.collection('passwordResetTokens').doc(hashedToken).get();

  if (!doc.exists) return null;

  const data = doc.data();
  const expiresAt = data?.expiresAt instanceof Timestamp ? data.expiresAt.toDate() : new Date(0);

  // Check expiry
  if (expiresAt < new Date()) {
    await doc.ref.delete();
    return null;
  }

  // Token is valid — delete it (one-time use)
  await doc.ref.delete();

  return data?.uid ?? null;
}

/**
 * Clean up expired tokens. Call via cron job.
 */
export async function cleanupExpiredResetTokens(): Promise<number> {
  const now = new Date();
  const snap = await adminDb
    .collection('passwordResetTokens')
    .where('expiresAt', '<', Timestamp.fromDate(now))
    .limit(100)
    .get();

  let count = 0;
  const batch = adminDb.batch();
  snap.docs.forEach((doc) => {
    batch.delete(doc.ref);
    count++;
  });

  if (count > 0) {
    await batch.commit();
  }

  return count;
}
