import { beforeUserCreated } from 'firebase-functions/v2/identity';
import { defineSecret } from 'firebase-functions/params';
import { devAuth } from './lib/dev-admin';

const DEV_SERVICE_ACCOUNT_JSON = defineSecret('DEV_SERVICE_ACCOUNT_JSON');

// Identity Platform blocking trigger fires on every prod sign-up. We mirror
// the user (UID-preserving) into dev so a session created on prod can be
// looked up in dev for testing. Password hashes are NOT available here —
// users created in dev this way will need a password reset to log in.
// For full hash-preserving auth replication, use the nightly clone-auth job.
export const mirrorAuthCreate = beforeUserCreated(
  { secrets: [DEV_SERVICE_ACCOUNT_JSON] },
  async (event) => {
    const u = event.data;
    if (!u) return;
    try {
      await devAuth().createUser({
        uid: u.uid,
        email: u.email ?? undefined,
        emailVerified: u.emailVerified,
        displayName: u.displayName ?? undefined,
        phoneNumber: u.phoneNumber ?? undefined,
        photoURL: u.photoURL ?? undefined,
        disabled: u.disabled,
      });
      if (u.customClaims) {
        await devAuth().setCustomUserClaims(u.uid, u.customClaims);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      // Already exists in dev — leave it alone, the user's claims may have
      // diverged intentionally.
      if (code !== 'auth/uid-already-exists' && code !== 'auth/email-already-exists') {
        console.error('[mirrorAuthCreate] failed', err);
      }
    }
  },
);
