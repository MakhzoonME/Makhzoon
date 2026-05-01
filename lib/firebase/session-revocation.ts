import { adminDb } from './admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Structure of revoked session tokens stored temporarily until expiry.
 * Self-deletes via Firestore TTL policy.
 * - sessionToken: the revoked session token
 * - userId: the user who owned the session
 * - revokedAt: timestamp when revoked
 * - expiresAt: when the token naturally expires (for TTL index)
 */

/**
 * Check if a session token has been revoked.
 */
export async function isSessionRevoked(sessionToken: string): Promise<boolean> {
  try {
    const doc = await adminDb.collection('revokedSessions').doc(sessionToken).get();
    return doc.exists;
  } catch {
    return false;
  }
}

/**
 * Revoke a session token (called on logout).
 * Token stored until natural expiry (5 days).
 */
export async function revokeSession(sessionToken: string, userId: string, expiresAt: Date): Promise<void> {
  try {
    await adminDb.collection('revokedSessions').doc(sessionToken).set({
      sessionToken,
      userId,
      revokedAt: FieldValue.serverTimestamp(),
      expiresAt,
    });
  } catch (err) {
    // Revocation failures should not break logout, just log
    console.error('[revokeSession] Failed to revoke session:', err);
  }
}

/**
 * Revoke all sessions for a user (called when password is changed or account is compromised).
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  try {
    const snap = await adminDb
      .collection('revokedSessions')
      .where('userId', '==', userId)
      .get();

    if (snap.docs.length > 0) {
      // User has sessions - batch delete them
      const batch = adminDb.batch();
      snap.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    // Also revoke via Firebase Admin SDK to clear refresh tokens
    // This is done separately in the route handler
  } catch (err) {
    console.error('[revokeAllUserSessions] Failed to revoke user sessions:', err);
  }
}
